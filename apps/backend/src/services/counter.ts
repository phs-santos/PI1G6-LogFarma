// Ações do profissional da unidade responsável sobre o pedido (balcão): preparar, dispensar, agendar entrega.
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db, DbOrTx, Tx } from "../db/client.js";
import {
    caregivers,
    couriers,
    deliveries,
    dispensations,
    medicationRequests,
    medications,
    patients,
    pharmacies,
    pharmacyStaff,
    prescriptions,
    stockReservations,
    waitlistEntries,
} from "../db/schema.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../domain/errors.js";
import { ageOn, isoDay } from "../domain/dates.js";
import type { RequestStatus } from "../domain/request-status.js";
import { consumeReservations, reserve } from "./stock.js";
import { notifyCouriers } from "./notifications.js";
import {
    lockRequest,
    notifyPatient,
    setStatus,
    toRequestView,
    type MedicationRequestRow,
    type RequestView,
} from "./requests.js";

export type Staff = typeof pharmacyStaff.$inferSelect;

export type CounterAction =
    | { action: "prepare" }
    | { action: "dispense"; pickedUpBy: "patient" | "caregiver"; caregiverId?: string }
    | { action: "schedule_delivery"; scheduledWindow: string; courierId?: string }
    | { action: "request_transfer"; fromPharmacyId: string }
    | { action: "order_from_supplier"; supplierId?: string };

/** Extensões registradas pelas outras etapas do fluxo (transferência, compra). */
type ActionHandler = (
    tx: Tx,
    staff: Staff,
    request: MedicationRequestRow,
    body: CounterAction,
) => Promise<void>;
const extraHandlers = new Map<string, ActionHandler>();
export function registerCounterAction(name: CounterAction["action"], handler: ActionHandler): void {
    extraHandlers.set(name, handler);
}

async function hasReservation(tx: DbOrTx, requestId: string): Promise<boolean> {
    const rows = await tx
        .select({ id: stockReservations.id })
        .from(stockReservations)
        .where(eq(stockReservations.requestId, requestId))
        .limit(1);
    return rows.length > 0;
}

/** Receita conferida e válida quando o remédio exige; antimicrobiano e controlado só com farmacêutico. */
export async function assertPrescriptionReady(
    tx: DbOrTx,
    staff: Staff,
    request: MedicationRequestRow,
    medication: typeof medications.$inferSelect,
): Promise<void> {
    if (medication.prescriptionType === "none") return;
    if (
        (medication.prescriptionType === "antimicrobial" ||
            medication.prescriptionType === "special_control") &&
        staff.occupation !== "pharmacist"
    ) {
        throw new ForbiddenError("Só o farmacêutico pode dispensar este medicamento.");
    }
    const [p] = request.prescriptionId
        ? await tx.select().from(prescriptions).where(eq(prescriptions.id, request.prescriptionId))
        : [];
    if (!p || !p.checkedAt) throw new ConflictError("Receita não conferida.");
    if (p.validUntil < isoDay()) throw new ConflictError("Receita vencida.");
}

async function prepare(tx: Tx, request: MedicationRequestRow, pharmacyName: string): Promise<void> {
    if (request.status === "waitlisted") {
        // Chegou estoque na unidade por outro caminho: atende quem está na fila.
        await tx
            .update(waitlistEntries)
            .set({ status: "served" })
            .where(
                and(
                    eq(waitlistEntries.requestId, request.id),
                    eq(waitlistEntries.status, "waiting"),
                ),
            );
    }
    if (request.status === "requested" || request.status === "waitlisted") {
        await reserve(tx, {
            pharmacyId: request.pharmacyId,
            medicationId: request.medicationId,
            quantity: request.quantity,
            requestId: request.id,
            today: isoDay(),
        });
    }
    await setStatus(tx, request, "ready_for_pickup");
    await notifyPatient(
        tx,
        request,
        "Remédio separado",
        `Seu remédio está separado na ${pharmacyName}. Pode retirar.`,
    );
}

async function dispense(
    tx: Tx,
    staff: Staff,
    request: MedicationRequestRow,
    medication: typeof medications.$inferSelect,
    body: Extract<CounterAction, { action: "dispense" }>,
): Promise<void> {
    // A transição vem primeiro: um segundo clique encontra "retirado" e recebe 409.
    await setStatus(tx, request, "picked_up");
    await assertPrescriptionReady(tx, staff, request, medication);
    let caregiverId: string | null = null;
    if (body.pickedUpBy === "caregiver") {
        const [c] = body.caregiverId
            ? await tx.select().from(caregivers).where(eq(caregivers.id, body.caregiverId))
            : [];
        if (!c || c.patientId !== request.patientId) {
            throw new ConflictError("Responsável não cadastrado para este paciente.");
        }
        caregiverId = c.id;
    }
    const consumed = await consumeReservations(
        tx,
        request.id,
        "exit_dispensation",
        staff.userId,
        isoDay(),
    );
    await tx.insert(dispensations).values(
        consumed.map((c) => ({
            requestId: request.id,
            pharmacyId: request.pharmacyId,
            medicationId: request.medicationId,
            batchId: c.batchId,
            quantity: c.quantity,
            staffUserId: staff.userId,
            prescriptionId: request.prescriptionId,
            pickedUpBy: body.pickedUpBy,
            caregiverId,
        })),
    );
    await notifyPatient(tx, request, "Remédio retirado", "Retirada registrada. Bom tratamento!");
}

async function scheduleDelivery(
    tx: Tx,
    staff: Staff,
    request: MedicationRequestRow,
    medication: typeof medications.$inferSelect,
    body: Extract<CounterAction, { action: "schedule_delivery" }>,
): Promise<void> {
    const from: RequestStatus = request.status;
    await setStatus(tx, request, "delivery_scheduled", { fulfillment: "delivery" });
    await assertPrescriptionReady(tx, staff, request, medication);
    if (from === "arrived" && !(await hasReservation(tx, request.id))) {
        await reserve(tx, {
            pharmacyId: request.pharmacyId,
            medicationId: request.medicationId,
            quantity: request.quantity,
            requestId: request.id,
            today: isoDay(),
        });
    }
    if (body.courierId) {
        const [c] = await tx.select().from(couriers).where(eq(couriers.userId, body.courierId));
        if (!c) throw new NotFoundError("Entregador não encontrado.");
    }
    const [patient] = await tx
        .select()
        .from(patients)
        .where(eq(patients.userId, request.patientId));
    const refrigerated = medication.storage === "refrigerated";
    await tx.insert(deliveries).values({
        requestId: request.id,
        courierId: body.courierId ?? null,
        scheduledByStaffId: staff.userId,
        addressSnapshot: patient!.address,
        scheduledWindow: body.scheduledWindow,
        requiresRefrigeration: refrigerated,
    });
    await notifyPatient(
        tx,
        request,
        "Entrega agendada",
        `Seu remédio será entregue em casa (${body.scheduledWindow}).${refrigerated ? " Ao receber, guarde na geladeira." : ""}`,
    );
    await notifyCouriers(
        tx,
        {
            title: "Nova entrega",
            body: `Entrega disponível (${body.scheduledWindow})${refrigerated ? " — remédio refrigerado" : ""}.`,
            requestId: request.id,
        },
        body.courierId,
    );
}

export async function runCounterAction(
    db: Db,
    staff: Staff,
    requestId: string,
    body: CounterAction,
): Promise<RequestView> {
    return db.transaction(async (tx) => {
        const request = await lockRequest(tx, requestId);
        if (request.pharmacyId !== staff.pharmacyId) {
            throw new ForbiddenError("Este pedido é de outra unidade.");
        }
        const [medication] = await tx
            .select()
            .from(medications)
            .where(eq(medications.id, request.medicationId));
        const unitName = await pharmacyName(tx, request.pharmacyId);
        switch (body.action) {
            case "prepare":
                await prepare(tx, request, unitName);
                break;
            case "dispense":
                await dispense(tx, staff, request, medication!, body);
                break;
            case "schedule_delivery":
                await scheduleDelivery(tx, staff, request, medication!, body);
                break;
            default: {
                const handler = extraHandlers.get(body.action);
                if (!handler) throw new ConflictError("Ação não disponível.");
                await handler(tx, staff, request, body);
            }
        }
        return toRequestView(tx, request.id);
    });
}

async function pharmacyName(tx: DbOrTx, id: string): Promise<string> {
    const [p] = await tx
        .select({ name: pharmacies.name })
        .from(pharmacies)
        .where(eq(pharmacies.id, id));
    return p?.name ?? "unidade";
}

export interface PharmacyRequestItem {
    request: RequestView;
    patient: {
        name: string;
        cns: string;
        age: number;
        phone: string;
        address: string | null;
        caregivers: { id: string; fullName: string; relationship: string }[];
    };
}

/** Pedidos da unidade do profissional, mais recentes primeiro. */
export async function listPharmacyRequests(
    db: DbOrTx,
    staff: Staff,
    status?: RequestStatus,
): Promise<PharmacyRequestItem[]> {
    const rows = await db
        .select()
        .from(medicationRequests)
        .where(
            status
                ? and(
                      eq(medicationRequests.pharmacyId, staff.pharmacyId),
                      eq(medicationRequests.status, status),
                  )
                : eq(medicationRequests.pharmacyId, staff.pharmacyId),
        )
        .orderBy(desc(medicationRequests.createdAt))
        .limit(200);
    const filtered = rows;
    if (filtered.length === 0) return [];
    const patientIds = [...new Set(filtered.map((r) => r.patientId))];
    const people = await db.select().from(patients).where(inArray(patients.userId, patientIds));
    const helpers = await db
        .select()
        .from(caregivers)
        .where(inArray(caregivers.patientId, patientIds));
    const today = isoDay();
    return Promise.all(
        filtered.map(async (r) => {
            const p = people.find((x) => x.userId === r.patientId)!;
            const a = p.address;
            return {
                request: await toRequestView(db, r.id),
                patient: {
                    name: p.socialName ?? p.fullName,
                    cns: p.cns,
                    age: ageOn(p.birthDate, today),
                    phone: p.phone,
                    address:
                        r.fulfillment === "delivery"
                            ? `${a.street}, ${a.number} — ${a.district}, ${a.city}/${a.state}`
                            : null,
                    caregivers: helpers
                        .filter((c) => c.patientId === p.userId)
                        .map((c) => ({
                            id: c.id,
                            fullName: c.fullName,
                            relationship: c.relationship,
                        })),
                },
            };
        }),
    );
}
