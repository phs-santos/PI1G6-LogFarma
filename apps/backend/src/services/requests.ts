// Pedido do paciente (MedicationRequest) e receita. Regras do design, seção "Situações do pedido".
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import type { Db, DbOrTx } from "../db/client.js";
import {
    deliveries,
    medicationRequests,
    medications,
    patients,
    pharmacies,
    prescriptions,
    waitlistEntries,
} from "../db/schema.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../domain/errors.js";
import { prescriptionValidUntil } from "../domain/prescription.js";
import { assertTransition, type RequestStatus } from "../domain/request-status.js";
import { compareWaitlist } from "../domain/priority.js";
import { isoDay } from "../domain/dates.js";
import { medicationDisplayName } from "../domain/medication-name.js";
import { toMedicationSummary, type MedicationSummary } from "./medications.js";
import { notify, notifyPharmacyStaff } from "./notifications.js";

export type MedicationRequestRow = typeof medicationRequests.$inferSelect;

export interface PrescriptionInput {
    issuedAt: string;
    prescriberName: string;
    prescriberCouncil: string;
    prescriberNumber: string;
    prescriberState: string;
    continuousUse: boolean;
}

export interface CreateRequestInput {
    medicationId: string;
    quantity: number;
    fulfillment: "pickup" | "delivery";
    prescription?: PrescriptionInput;
    /** Receita já cadastrada da própria paciente, para o mesmo medicamento. */
    prescriptionId?: string;
}

export interface PrescriptionView {
    id: string;
    type: "simple" | "antimicrobial" | "special_control";
    issuedAt: string;
    validUntil: string;
    prescriberName: string;
    checked: boolean;
}

export interface RequestView {
    id: string;
    status: RequestStatus;
    fulfillment: "pickup" | "delivery";
    quantity: number;
    medication: MedicationSummary;
    pharmacy: { id: string; name: string; address: string; openingHours: string };
    sourcePharmacy: { id: string; name: string } | null;
    expectedAt: string | null;
    prescription: PrescriptionView | null;
    waitlistPosition: number | null;
    delivery: {
        id: string;
        status: string;
        scheduledWindow: string;
        requiresRefrigeration: boolean;
    } | null;
    createdAt: string;
    updatedAt: string;
}

export function toPrescriptionView(p: typeof prescriptions.$inferSelect): PrescriptionView {
    return {
        id: p.id,
        type: p.type as PrescriptionView["type"],
        issuedAt: p.issuedAt,
        validUntil: p.validUntil,
        prescriberName: p.prescriberName,
        checked: p.checkedAt !== null,
    };
}

/** Posição do pedido na fila de espera daquela unidade+remédio (1 = próximo). */
async function waitlistPosition(tx: DbOrTx, requestId: string): Promise<number | null> {
    const [entry] = await tx
        .select()
        .from(waitlistEntries)
        .where(
            and(eq(waitlistEntries.requestId, requestId), eq(waitlistEntries.status, "waiting")),
        );
    if (!entry) return null;
    const queue = await tx
        .select()
        .from(waitlistEntries)
        .where(
            and(
                eq(waitlistEntries.pharmacyId, entry.pharmacyId),
                eq(waitlistEntries.medicationId, entry.medicationId),
                eq(waitlistEntries.status, "waiting"),
            ),
        );
    queue.sort(compareWaitlist);
    return queue.findIndex((e) => e.id === entry.id) + 1;
}

export async function toRequestView(tx: DbOrTx, requestId: string): Promise<RequestView> {
    const [row] = await tx
        .select()
        .from(medicationRequests)
        .where(eq(medicationRequests.id, requestId));
    if (!row) throw new NotFoundError("Pedido não encontrado.");
    const [medication] = await tx
        .select()
        .from(medications)
        .where(eq(medications.id, row.medicationId));
    const unitIds = [row.pharmacyId, ...(row.sourcePharmacyId ? [row.sourcePharmacyId] : [])];
    const units = await tx.select().from(pharmacies).where(inArray(pharmacies.id, unitIds));
    const unit = units.find((u) => u.id === row.pharmacyId)!;
    const source = row.sourcePharmacyId
        ? units.find((u) => u.id === row.sourcePharmacyId)
        : undefined;
    const [prescription] = row.prescriptionId
        ? await tx.select().from(prescriptions).where(eq(prescriptions.id, row.prescriptionId))
        : [];
    const [delivery] = await tx
        .select()
        .from(deliveries)
        .where(eq(deliveries.requestId, row.id))
        .orderBy(desc(deliveries.createdAt))
        .limit(1);
    return {
        id: row.id,
        status: row.status,
        fulfillment: row.fulfillment,
        quantity: row.quantity,
        medication: toMedicationSummary(medication!),
        pharmacy: {
            id: unit.id,
            name: unit.name,
            address: unit.address,
            openingHours: unit.openingHours,
        },
        sourcePharmacy: source ? { id: source.id, name: source.name } : null,
        expectedAt: row.expectedAt,
        prescription: prescription ? toPrescriptionView(prescription) : null,
        waitlistPosition: await waitlistPosition(tx, row.id),
        delivery: delivery
            ? {
                  id: delivery.id,
                  status: delivery.status,
                  scheduledWindow: delivery.scheduledWindow,
                  requiresRefrigeration: delivery.requiresRefrigeration,
              }
            : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

/** Trava e devolve o pedido. */
export async function lockRequest(tx: DbOrTx, requestId: string): Promise<MedicationRequestRow> {
    const [row] = await tx
        .select()
        .from(medicationRequests)
        .where(eq(medicationRequests.id, requestId))
        .for("update");
    if (!row) throw new NotFoundError("Pedido não encontrado.");
    return row;
}

/** Muda a situação do pedido validando a transição. */
export async function setStatus(
    tx: DbOrTx,
    request: MedicationRequestRow,
    to: RequestStatus,
    extra: Partial<typeof medicationRequests.$inferInsert> = {},
): Promise<void> {
    assertTransition(request.status, to);
    await tx
        .update(medicationRequests)
        .set({ ...extra, status: to, updatedAt: new Date() })
        .where(eq(medicationRequests.id, request.id));
    request.status = to;
}

async function insertPrescription(
    tx: DbOrTx,
    patientId: string,
    medication: typeof medications.$inferSelect,
    input: PrescriptionInput,
): Promise<string> {
    if (medication.prescriptionType === "none") {
        throw new BadRequestError("Este medicamento não precisa de receita.");
    }
    const type = medication.prescriptionType;
    const [row] = await tx
        .insert(prescriptions)
        .values({
            patientId,
            medicationId: medication.id,
            type,
            issuedAt: input.issuedAt,
            validUntil: prescriptionValidUntil(type, input.continuousUse, input.issuedAt),
            prescriberName: input.prescriberName,
            prescriberCouncil: input.prescriberCouncil,
            prescriberNumber: input.prescriberNumber,
            prescriberState: input.prescriberState,
            continuousUse: input.continuousUse,
        })
        .returning({ id: prescriptions.id });
    return row!.id;
}

/**
 * Receita pode ir para um novo pedido? Precisa estar válida em `today` e, se não for simples de
 * uso contínuo (antimicrobiano, controle especial, simples comum), não pode já estar em outro pedido.
 */
export async function isPrescriptionReusable(
    tx: DbOrTx,
    p: typeof prescriptions.$inferSelect,
    today: string,
): Promise<boolean> {
    if (p.validUntil < today) return false;
    if (p.type === "simple" && p.continuousUse) return true;
    const used = await tx
        .select({ id: medicationRequests.id })
        .from(medicationRequests)
        .where(
            and(
                eq(medicationRequests.prescriptionId, p.id),
                ne(medicationRequests.status, "cancelled"),
            ),
        )
        .limit(1);
    return used.length === 0;
}

export type MyPrescription = PrescriptionView & { medicationId: string; usable: boolean };

/** Receitas da paciente (opcionalmente de um remédio), mais novas primeiro. */
export async function listPatientPrescriptions(
    db: DbOrTx,
    patientId: string,
    medicationId?: string,
): Promise<MyPrescription[]> {
    const rows = await db
        .select()
        .from(prescriptions)
        .where(
            medicationId
                ? and(
                      eq(prescriptions.patientId, patientId),
                      eq(prescriptions.medicationId, medicationId),
                  )
                : eq(prescriptions.patientId, patientId),
        )
        .orderBy(desc(prescriptions.issuedAt));
    const today = isoDay();
    return Promise.all(
        rows.map(async (p) => ({
            ...toPrescriptionView(p),
            medicationId: p.medicationId,
            usable: await isPrescriptionReusable(db, p, today),
        })),
    );
}

/** Unidade responsável: farmácia de especializados para alto custo, senão a de referência. */
async function responsibleUnit(
    tx: DbOrTx,
    medication: typeof medications.$inferSelect,
    patient: typeof patients.$inferSelect,
): Promise<string> {
    if (medication.component !== "specialized") return patient.referencePharmacyId;
    const [esp] = await tx
        .select({ id: pharmacies.id })
        .from(pharmacies)
        .where(eq(pharmacies.kind, "specialized_pharmacy"))
        .orderBy(asc(pharmacies.createdAt))
        .limit(1);
    if (!esp) throw new ConflictError("Não há farmácia de medicamentos especializados cadastrada.");
    return esp.id;
}

export async function createRequest(
    db: Db,
    patientId: string,
    input: CreateRequestInput,
): Promise<RequestView> {
    return db.transaction(async (tx) => {
        const [patient] = await tx.select().from(patients).where(eq(patients.userId, patientId));
        if (!patient) throw new ForbiddenError("Esta ação é só para pacientes.");
        const [medication] = await tx
            .select()
            .from(medications)
            .where(eq(medications.id, input.medicationId));
        if (!medication) throw new NotFoundError("Medicamento não encontrado.");
        const pharmacyId = await responsibleUnit(tx, medication, patient);
        let prescriptionId: string | null = null;
        if (input.prescriptionId) {
            const [own] = await tx
                .select()
                .from(prescriptions)
                .where(eq(prescriptions.id, input.prescriptionId));
            if (!own || own.patientId !== patientId || own.medicationId !== medication.id) {
                throw new NotFoundError("Receita não encontrada.");
            }
            if (!(await isPrescriptionReusable(tx, own, isoDay()))) {
                throw new ConflictError("Esta receita vale para um pedido só e já foi usada.");
            }
            prescriptionId = own.id;
        } else if (input.prescription) {
            prescriptionId = await insertPrescription(
                tx,
                patientId,
                medication,
                input.prescription,
            );
        }
        const [row] = await tx
            .insert(medicationRequests)
            .values({
                patientId,
                medicationId: medication.id,
                quantity: input.quantity,
                fulfillment: input.fulfillment,
                pharmacyId,
                prescriptionId,
            })
            .returning({ id: medicationRequests.id });
        await notifyPharmacyStaff(tx, pharmacyId, {
            title: "Novo pedido",
            body: `Novo pedido de ${medicationDisplayName(medication)} (${input.quantity} ${medication.dispensingUnit}).`,
            requestId: row!.id,
        });
        return toRequestView(tx, row!.id);
    });
}

export async function listPatientRequests(db: DbOrTx, patientId: string): Promise<RequestView[]> {
    const rows = await db
        .select({ id: medicationRequests.id })
        .from(medicationRequests)
        .where(eq(medicationRequests.patientId, patientId))
        .orderBy(desc(medicationRequests.createdAt));
    return Promise.all(rows.map((r) => toRequestView(db, r.id)));
}

async function ownRequest(
    tx: DbOrTx,
    patientId: string,
    requestId: string,
): Promise<MedicationRequestRow> {
    const row = await lockRequest(tx, requestId);
    if (row.patientId !== patientId) throw new NotFoundError("Pedido não encontrado.");
    return row;
}

export async function getPatientRequest(
    db: DbOrTx,
    patientId: string,
    requestId: string,
): Promise<RequestView> {
    const [row] = await db
        .select()
        .from(medicationRequests)
        .where(eq(medicationRequests.id, requestId));
    if (!row || row.patientId !== patientId) throw new NotFoundError("Pedido não encontrado.");
    return toRequestView(db, requestId);
}

const FULFILLMENT_CHANGE_ALLOWED: RequestStatus[] = [
    "requested",
    "in_transfer",
    "waitlisted",
    "arrived",
    "ready_for_pickup",
];

export async function updatePatientRequest(
    db: Db,
    patientId: string,
    requestId: string,
    patch: { fulfillment?: "pickup" | "delivery"; cancel?: true },
): Promise<RequestView> {
    return db.transaction(async (tx) => {
        const row = await ownRequest(tx, patientId, requestId);
        if (patch.cancel) {
            if (row.status !== "requested" && row.status !== "waitlisted") {
                throw new ConflictError(
                    "Este pedido já está em andamento e não pode mais ser cancelado.",
                );
            }
            await tx
                .update(waitlistEntries)
                .set({ status: "cancelled" })
                .where(
                    and(
                        eq(waitlistEntries.requestId, row.id),
                        eq(waitlistEntries.status, "waiting"),
                    ),
                );
            await setStatus(tx, row, "cancelled");
            await notifyPharmacyStaff(tx, row.pharmacyId, {
                title: "Pedido cancelado",
                body: "O paciente cancelou um pedido.",
                requestId: row.id,
            });
        } else if (patch.fulfillment) {
            if (!FULFILLMENT_CHANGE_ALLOWED.includes(row.status)) {
                throw new ConflictError(
                    "Neste momento não dá mais para mudar entre retirar e receber em casa.",
                );
            }
            await tx
                .update(medicationRequests)
                .set({ fulfillment: patch.fulfillment, updatedAt: new Date() })
                .where(eq(medicationRequests.id, row.id));
        }
        return toRequestView(tx, row.id);
    });
}

/** Receita informada pelo paciente dono do pedido ou por profissional da unidade responsável. */
export async function attachPrescription(
    db: Db,
    actor: { id: string; role: string; pharmacyId?: string },
    requestId: string,
    input: PrescriptionInput,
): Promise<RequestView> {
    return db.transaction(async (tx) => {
        const row = await lockRequest(tx, requestId);
        const isOwner = actor.role === "patient" && row.patientId === actor.id;
        const isStaff = actor.role === "pharmacy_staff" && actor.pharmacyId === row.pharmacyId;
        if (!isOwner && !isStaff) throw new NotFoundError("Pedido não encontrado.");
        if (["picked_up", "delivered", "cancelled"].includes(row.status)) {
            throw new ConflictError("Este pedido já foi encerrado.");
        }
        const [medication] = await tx
            .select()
            .from(medications)
            .where(eq(medications.id, row.medicationId));
        const prescriptionId = await insertPrescription(tx, row.patientId, medication!, input);
        await tx
            .update(medicationRequests)
            .set({ prescriptionId, updatedAt: new Date() })
            .where(eq(medicationRequests.id, row.id));
        return toRequestView(tx, row.id);
    });
}

/** Conferência da receita no balcão. Antimicrobiano e controlado: só farmacêutico. */
export async function checkPrescription(
    db: Db,
    staff: { userId: string; pharmacyId: string; occupation: "pharmacist" | "pharmacy_assistant" },
    prescriptionId: string,
): Promise<PrescriptionView> {
    return db.transaction(async (tx) => {
        const [p] = await tx
            .select()
            .from(prescriptions)
            .where(eq(prescriptions.id, prescriptionId))
            .for("update");
        if (!p) throw new NotFoundError("Receita não encontrada.");
        const linked = await tx
            .select({ id: medicationRequests.id })
            .from(medicationRequests)
            .where(
                and(
                    eq(medicationRequests.prescriptionId, p.id),
                    eq(medicationRequests.pharmacyId, staff.pharmacyId),
                ),
            );
        if (linked.length === 0)
            throw new ForbiddenError("Esta receita é de um pedido de outra unidade.");
        if (
            (p.type === "antimicrobial" || p.type === "special_control") &&
            staff.occupation !== "pharmacist"
        ) {
            throw new ForbiddenError("Só o farmacêutico pode conferir esta receita.");
        }
        if (p.validUntil < isoDay()) throw new ConflictError("A receita está vencida.");
        const [updated] = await tx
            .update(prescriptions)
            .set({ checkedByStaffId: staff.userId, checkedAt: new Date() })
            .where(eq(prescriptions.id, p.id))
            .returning();
        return toPrescriptionView(updated!);
    });
}

export async function notifyPatient(
    tx: DbOrTx,
    request: MedicationRequestRow,
    title: string,
    body: string,
): Promise<void> {
    await notify(tx, { userId: request.patientId, title, body, requestId: request.id });
}
