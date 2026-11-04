import { eq } from "drizzle-orm";
import type { DbOrTx } from "../db/client.js";
import {
    couriers,
    patientPriorities,
    patients,
    pharmacies,
    pharmacyStaff,
    supplierStaff,
    suppliers,
    users,
} from "../db/schema.js";
import { BadRequestError, ConflictError, ForbiddenError } from "../domain/errors.js";
import { hashPassword } from "../auth/password.js";
import type { CreateAccountInput, RegisterPatientInput, UserRole } from "../contracts.js";

const PUBLIC_REFERENCE_KINDS = new Set(["ubs", "municipal_pharmacy"]);

function isUniqueViolation(err: unknown): boolean {
    return (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: unknown }).code === "23505"
    );
}

async function insertUser(
    tx: DbOrTx,
    role: UserRole,
    email: string,
    password: string,
): Promise<string> {
    const existing = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()));
    if (existing.length > 0) {
        throw new ConflictError("Já existe uma conta com este e-mail.");
    }
    const [user] = await tx
        .insert(users)
        .values({ role, email: email.toLowerCase(), passwordHash: await hashPassword(password) })
        .returning({ id: users.id });
    return user!.id;
}

/** Cadastro do paciente (ele mesmo). Prioridade clínica só com consentimento (LGPD art. 11). */
export async function registerPatient(
    db: DbOrTx,
    input: RegisterPatientInput,
): Promise<{ userId: string }> {
    if (input.priority && input.priority.consent !== true) {
        throw new BadRequestError("Para usar a prioridade é preciso dar o consentimento.");
    }
    try {
        return await db.transaction(async (tx) => {
            const [reference] = await tx
                .select({ kind: pharmacies.kind })
                .from(pharmacies)
                .where(eq(pharmacies.id, input.referencePharmacyId));
            if (!reference || !PUBLIC_REFERENCE_KINDS.has(reference.kind)) {
                throw new BadRequestError(
                    "A unidade de referência precisa ser uma UBS ou farmácia municipal.",
                );
            }
            const userId = await insertUser(tx, "patient", input.email, input.password);
            await tx.insert(patients).values({
                userId,
                fullName: input.fullName,
                socialName: input.socialName ?? null,
                birthDate: input.birthDate,
                cns: input.cns,
                cpf: input.cpf ?? null,
                phone: input.phone,
                address: input.address,
                latitude: input.latitude ?? null,
                longitude: input.longitude ?? null,
                referencePharmacyId: input.referencePharmacyId,
                mobilityLimited: input.mobilityLimited,
                notificationsConsentAt: new Date(),
            });
            if (input.priority) {
                await tx.insert(patientPriorities).values({
                    patientId: userId,
                    category: input.priority.category,
                    consentAt: new Date(),
                });
            }
            return { userId };
        });
    } catch (err) {
        if (isUniqueViolation(err)) {
            throw new ConflictError("Já existe um cadastro com este Cartão SUS ou CPF.");
        }
        throw err;
    }
}

/** Contas de profissional, fornecedor, entregador e gestor (criadas pelo gestor ou pelo seed). */
export async function createAccount(
    db: DbOrTx,
    input: CreateAccountInput,
): Promise<{ userId: string }> {
    return db.transaction(async (tx) => {
        if (input.role === "pharmacy_staff") {
            if (!input.pharmacyId || !input.occupation) {
                throw new BadRequestError(
                    "Profissional da farmácia precisa de unidade e ocupação.",
                );
            }
            if (input.occupation === "pharmacist" && (!input.crfNumber || !input.crfState)) {
                throw new BadRequestError("Farmacêutico precisa de CRF e UF do CRF.");
            }
            const [pharmacy] = await tx
                .select({ kind: pharmacies.kind })
                .from(pharmacies)
                .where(eq(pharmacies.id, input.pharmacyId));
            if (!pharmacy || pharmacy.kind === "pfpb") {
                throw new BadRequestError("A unidade precisa ser da rede pública.");
            }
        }
        if (input.role === "supplier_staff") {
            if (!input.supplierId) {
                throw new BadRequestError("Atendente de fornecedor precisa do fornecedor.");
            }
            const [supplier] = await tx
                .select({ id: suppliers.id })
                .from(suppliers)
                .where(eq(suppliers.id, input.supplierId));
            if (!supplier) {
                throw new BadRequestError("Fornecedor não encontrado.");
            }
        }
        if (input.role === "courier" && (!input.phone || !input.deliveryProgram)) {
            throw new BadRequestError("Entregador precisa de telefone e programa de entrega.");
        }

        const userId = await insertUser(tx, input.role, input.email, input.password);
        if (input.role === "pharmacy_staff") {
            await tx.insert(pharmacyStaff).values({
                userId,
                fullName: input.fullName,
                pharmacyId: input.pharmacyId!,
                occupation: input.occupation!,
                crfNumber: input.crfNumber ?? null,
                crfState: input.crfState ?? null,
            });
        } else if (input.role === "supplier_staff") {
            await tx
                .insert(supplierStaff)
                .values({ userId, fullName: input.fullName, supplierId: input.supplierId! });
        } else if (input.role === "courier") {
            await tx.insert(couriers).values({
                userId,
                fullName: input.fullName,
                phone: input.phone!,
                deliveryProgram: input.deliveryProgram!,
            });
        }
        return { userId };
    });
}

// ---------- perfis carregados a partir da sessão ----------

export async function getPatientByUser(db: DbOrTx, userId: string) {
    const [row] = await db.select().from(patients).where(eq(patients.userId, userId));
    if (!row) throw new ForbiddenError("Esta ação é só para pacientes.");
    return row;
}

export async function getStaffByUser(db: DbOrTx, userId: string) {
    const [row] = await db.select().from(pharmacyStaff).where(eq(pharmacyStaff.userId, userId));
    if (!row) throw new ForbiddenError("Esta ação é só para profissionais da farmácia.");
    return row;
}

export async function getSupplierStaffByUser(db: DbOrTx, userId: string) {
    const [row] = await db.select().from(supplierStaff).where(eq(supplierStaff.userId, userId));
    if (!row) throw new ForbiddenError("Esta ação é só para fornecedores.");
    return row;
}

export async function getCourierByUser(db: DbOrTx, userId: string) {
    const [row] = await db.select().from(couriers).where(eq(couriers.userId, userId));
    if (!row) throw new ForbiddenError("Esta ação é só para entregadores.");
    return row;
}
