// Perfil do paciente, consentimento da prioridade clínica (LGPD art. 11) e responsáveis pela retirada.
import { and, eq, isNull } from "drizzle-orm";
import type { Db, DbOrTx } from "../db/client.js";
import {
    caregivers,
    dispensations,
    patientPriorities,
    patients,
    pharmacies,
    type Address,
} from "../db/schema.js";
import { BadRequestError, ConflictError, NotFoundError } from "../domain/errors.js";
import type { PriorityCategory } from "../contracts.js";
import { activeCategory, recalculateWaitlist } from "./purchasing.js";

export interface PatientProfile {
    fullName: string;
    socialName: string | null;
    birthDate: string;
    cns: string;
    cpf: string | null;
    phone: string;
    address: Address;
    latitude: number | null;
    longitude: number | null;
    referencePharmacy: { id: string; name: string };
    mobilityLimited: boolean;
    priority: { category: PriorityCategory; consentAt: string } | null;
}

export interface ProfilePatch {
    phone?: string;
    address?: Address;
    latitude?: number | null;
    longitude?: number | null;
    mobilityLimited?: boolean;
    referencePharmacyId?: string;
    priority?: { category: PriorityCategory; consent: true } | { revoke: true };
}

export async function getProfile(db: DbOrTx, patientId: string): Promise<PatientProfile> {
    const [p] = await db.select().from(patients).where(eq(patients.userId, patientId));
    if (!p) throw new NotFoundError("Paciente não encontrado.");
    const [unit] = await db
        .select()
        .from(pharmacies)
        .where(eq(pharmacies.id, p.referencePharmacyId));
    const [priority] = await db
        .select()
        .from(patientPriorities)
        .where(
            and(eq(patientPriorities.patientId, patientId), isNull(patientPriorities.revokedAt)),
        );
    return {
        fullName: p.fullName,
        socialName: p.socialName,
        birthDate: p.birthDate,
        cns: p.cns,
        cpf: p.cpf,
        phone: p.phone,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        referencePharmacy: { id: unit!.id, name: unit!.name },
        mobilityLimited: p.mobilityLimited,
        priority: priority
            ? { category: priority.category, consentAt: priority.consentAt.toISOString() }
            : null,
    };
}

export async function updateProfile(
    db: Db,
    patientId: string,
    patch: ProfilePatch,
): Promise<PatientProfile> {
    await db.transaction(async (tx) => {
        const { priority, ...fields } = patch;
        if (fields.referencePharmacyId) {
            const [unit] = await tx
                .select()
                .from(pharmacies)
                .where(eq(pharmacies.id, fields.referencePharmacyId));
            if (!unit || (unit.kind !== "ubs" && unit.kind !== "municipal_pharmacy")) {
                throw new BadRequestError(
                    "A unidade de referência precisa ser uma UBS ou farmácia municipal.",
                );
            }
        }
        if (Object.keys(fields).length > 0) {
            await tx.update(patients).set(fields).where(eq(patients.userId, patientId));
        }
        if (priority) {
            const before = await activeCategory(tx, patientId);
            await tx
                .update(patientPriorities)
                .set({ revokedAt: new Date() })
                .where(
                    and(
                        eq(patientPriorities.patientId, patientId),
                        isNull(patientPriorities.revokedAt),
                    ),
                );
            if ("category" in priority) {
                await tx
                    .insert(patientPriorities)
                    .values({ patientId, category: priority.category, consentAt: new Date() });
            }
            if (before !== ("category" in priority ? priority.category : null)) {
                await recalculateWaitlist(tx, patientId, new Date());
            }
        }
    });
    return getProfile(db, patientId);
}

export interface CaregiverView {
    id: string;
    fullName: string;
    document: string;
    relationship: string;
    phone: string;
}

export async function listCaregivers(db: DbOrTx, patientId: string): Promise<CaregiverView[]> {
    const rows = await db.select().from(caregivers).where(eq(caregivers.patientId, patientId));
    return rows.map(({ id, fullName, document, relationship, phone }) => ({
        id,
        fullName,
        document,
        relationship,
        phone,
    }));
}

export async function addCaregiver(
    db: DbOrTx,
    patientId: string,
    input: Omit<CaregiverView, "id">,
): Promise<CaregiverView> {
    const [row] = await db
        .insert(caregivers)
        .values({ patientId, ...input })
        .returning();
    const { id, fullName, document, relationship, phone } = row!;
    return { id, fullName, document, relationship, phone };
}

export async function removeCaregiver(
    db: DbOrTx,
    patientId: string,
    caregiverId: string,
): Promise<void> {
    const [row] = await db.select().from(caregivers).where(eq(caregivers.id, caregiverId));
    if (!row || row.patientId !== patientId) throw new NotFoundError("Responsável não encontrado.");
    const used = await db
        .select({ id: dispensations.id })
        .from(dispensations)
        .where(eq(dispensations.caregiverId, caregiverId))
        .limit(1);
    if (used.length > 0) {
        throw new ConflictError(
            "Este responsável já retirou remédios e fica no histórico; não pode ser apagado.",
        );
    }
    await db.delete(caregivers).where(eq(caregivers.id, caregiverId));
}
