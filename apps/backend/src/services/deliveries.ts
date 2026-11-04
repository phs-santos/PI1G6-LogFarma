// RF08 — entrega domiciliar pelo programa municipal. O entregador aceita, retira, entrega ou informa falha.
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import type { Db, DbOrTx } from "../db/client.js";
import {
    deliveries,
    dispensations,
    medicationRequests,
    medications,
    patients,
    pharmacies,
} from "../db/schema.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../domain/errors.js";
import { isoDay } from "../domain/dates.js";
import { medicationDisplayName } from "../domain/medication-name.js";
import { consumeReservations } from "./stock.js";
import { notifyPharmacyStaff } from "./notifications.js";
import { lockRequest, notifyPatient, setStatus } from "./requests.js";

export interface DeliveryView {
    id: string;
    requestId: string;
    status: "scheduled" | "out_for_delivery" | "delivered" | "failed";
    scheduledWindow: string;
    requiresRefrigeration: boolean;
    courierId: string | null;
    medication: string;
    pharmacy: { name: string; address: string };
    recipient: { name: string; address: string; phone: string };
    receivedBy: string | null;
    failureReason: string | null;
    createdAt: string;
}

async function views(db: DbOrTx, where: SQL | undefined): Promise<DeliveryView[]> {
    const rows = await db
        .select()
        .from(deliveries)
        .where(where)
        .orderBy(desc(deliveries.createdAt))
        .limit(200);
    if (rows.length === 0) return [];
    const reqs = await db
        .select()
        .from(medicationRequests)
        .where(
            inArray(
                medicationRequests.id,
                rows.map((r) => r.requestId),
            ),
        );
    const meds = await db
        .select()
        .from(medications)
        .where(inArray(medications.id, [...new Set(reqs.map((r) => r.medicationId))]));
    const units = await db
        .select()
        .from(pharmacies)
        .where(inArray(pharmacies.id, [...new Set(reqs.map((r) => r.pharmacyId))]));
    const people = await db
        .select()
        .from(patients)
        .where(inArray(patients.userId, [...new Set(reqs.map((r) => r.patientId))]));
    return rows.map((d) => {
        const r = reqs.find((x) => x.id === d.requestId)!;
        const u = units.find((x) => x.id === r.pharmacyId)!;
        const p = people.find((x) => x.userId === r.patientId)!;
        const a = d.addressSnapshot;
        return {
            id: d.id,
            requestId: d.requestId,
            status: d.status,
            scheduledWindow: d.scheduledWindow,
            requiresRefrigeration: d.requiresRefrigeration,
            courierId: d.courierId,
            medication: medicationDisplayName(meds.find((m) => m.id === r.medicationId)!),
            pharmacy: { name: u.name, address: u.address },
            recipient: {
                name: p.socialName ?? p.fullName,
                address: `${a.street}, ${a.number} — ${a.district}, ${a.city}/${a.state}`,
                phone: p.phone,
            },
            receivedBy: d.receivedBy,
            failureReason: d.failureReason,
            createdAt: d.createdAt.toISOString(),
        };
    });
}

export async function pharmacyDeliveries(db: DbOrTx, pharmacyId: string): Promise<DeliveryView[]> {
    const ids = db
        .select({ id: medicationRequests.id })
        .from(medicationRequests)
        .where(eq(medicationRequests.pharmacyId, pharmacyId));
    return views(db, inArray(deliveries.requestId, ids));
}

export async function courierDeliveries(
    db: DbOrTx,
    courierId: string,
    scope: "available" | "mine",
): Promise<DeliveryView[]> {
    return views(
        db,
        scope === "available"
            ? and(eq(deliveries.status, "scheduled"), isNull(deliveries.courierId))
            : eq(deliveries.courierId, courierId),
    );
}

export type CourierAction =
    | { action: "accept" }
    | { action: "pick_up" }
    | { action: "deliver"; receivedBy: string }
    | { action: "fail"; reason: string };

export async function runCourierAction(
    db: Db,
    courierId: string,
    deliveryId: string,
    body: CourierAction,
): Promise<DeliveryView> {
    await db.transaction(async (tx) => {
        const [d] = await tx
            .select()
            .from(deliveries)
            .where(eq(deliveries.id, deliveryId))
            .for("update");
        if (!d) throw new NotFoundError("Entrega não encontrada.");
        const request = await lockRequest(tx, d.requestId);

        if (body.action === "accept") {
            if (d.status !== "scheduled")
                throw new ConflictError("Esta entrega não está mais disponível.");
            if (d.courierId && d.courierId !== courierId)
                throw new ConflictError("Outro entregador já aceitou esta entrega.");
            await tx.update(deliveries).set({ courierId }).where(eq(deliveries.id, d.id));
            return;
        }
        if (d.courierId !== courierId)
            throw new ForbiddenError("Esta entrega é de outro entregador.");

        if (body.action === "pick_up") {
            if (d.status !== "scheduled") throw new ConflictError("Esta entrega já saiu.");
            await setStatus(tx, request, "out_for_delivery");
            await tx
                .update(deliveries)
                .set({ status: "out_for_delivery", pickedUpAt: new Date() })
                .where(eq(deliveries.id, d.id));
            await notifyPatient(
                tx,
                request,
                "Saiu para entrega",
                "Seu remédio saiu para entrega e chega em breve.",
            );
            await notifyPharmacyStaff(tx, request.pharmacyId, {
                title: "Entrega retirada",
                body: "O entregador retirou o remédio na unidade.",
                requestId: request.id,
            });
        } else if (body.action === "deliver") {
            if (d.status !== "out_for_delivery")
                throw new ConflictError("A entrega ainda não saiu.");
            await setStatus(tx, request, "delivered");
            await tx
                .update(deliveries)
                .set({ status: "delivered", receivedBy: body.receivedBy, deliveredAt: new Date() })
                .where(eq(deliveries.id, d.id));
            // A baixa do estoque acontece na entrega concluída (até aqui o remédio estava reservado).
            const consumed = await consumeReservations(
                tx,
                request.id,
                "exit_dispensation",
                d.scheduledByStaffId,
                isoDay(),
            );
            await tx.insert(dispensations).values(
                consumed.map((c) => ({
                    requestId: request.id,
                    pharmacyId: request.pharmacyId,
                    medicationId: request.medicationId,
                    batchId: c.batchId,
                    quantity: c.quantity,
                    staffUserId: d.scheduledByStaffId,
                    prescriptionId: request.prescriptionId,
                    pickedUpBy: "delivery" as const,
                })),
            );
            await notifyPatient(
                tx,
                request,
                "Entregue",
                "Seu remédio foi entregue. Bom tratamento!",
            );
            await notifyPharmacyStaff(tx, request.pharmacyId, {
                title: "Entrega concluída",
                body: "A entrega foi concluída.",
                requestId: request.id,
            });
        } else {
            if (d.status !== "out_for_delivery")
                throw new ConflictError("A entrega ainda não saiu.");
            await setStatus(tx, request, "arrived");
            await tx
                .update(deliveries)
                .set({ status: "failed", failureReason: body.reason })
                .where(eq(deliveries.id, d.id));
            await notifyPatient(
                tx,
                request,
                "Entrega não concluída",
                "A entrega não foi concluída; a farmácia vai reagendar com você.",
            );
            await notifyPharmacyStaff(tx, request.pharmacyId, {
                title: "Entrega não concluída",
                body: `Motivo informado pelo entregador: ${body.reason}`,
                requestId: request.id,
            });
        }
    });
    const [view] = await views(db, eq(deliveries.id, deliveryId));
    return view!;
}
