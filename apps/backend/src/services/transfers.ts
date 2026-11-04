// RF07 — transferência entre unidades da rede pública. A origem envia ou recusa; o destino recebe.
import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { Db, Tx } from "../db/client.js";
import { medications, pharmacies, stockBatches, transfers } from "../db/schema.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../domain/errors.js";
import { isoDay } from "../domain/dates.js";
import { medicationDisplayName } from "../domain/medication-name.js";
import {
    addBatch,
    consumeReservations,
    releaseReservations,
    reserve,
    reserveOnBatch,
} from "./stock.js";
import { notifyPharmacyStaff } from "./notifications.js";
import { lockRequest, notifyPatient, setStatus } from "./requests.js";
import { registerCounterAction, type Staff } from "./counter.js";

const PUBLIC_KINDS = ["ubs", "municipal_pharmacy", "specialized_pharmacy"] as const;

async function unitName(tx: Tx, id: string): Promise<string> {
    const [p] = await tx
        .select({ name: pharmacies.name })
        .from(pharmacies)
        .where(eq(pharmacies.id, id));
    return p?.name ?? "unidade";
}

// Ação do balcão: pedir o remédio a outra unidade.
registerCounterAction("request_transfer", async (tx, staff, request, body) => {
    if (body.action !== "request_transfer") return;
    const [origin] = await tx
        .select()
        .from(pharmacies)
        .where(eq(pharmacies.id, body.fromPharmacyId));
    if (!origin) throw new NotFoundError("Unidade de origem não encontrada.");
    if (!(PUBLIC_KINDS as readonly string[]).includes(origin.kind)) {
        throw new ConflictError(
            "Transferência só entre unidades da rede pública (o Farmácia Popular não permite).",
        );
    }
    if (origin.id === request.pharmacyId) {
        throw new ConflictError("A unidade de origem precisa ser outra.");
    }
    await setStatus(tx, request, "in_transfer", { sourcePharmacyId: origin.id });
    const picks = await reserve(tx, {
        pharmacyId: origin.id,
        medicationId: request.medicationId,
        quantity: request.quantity,
        requestId: request.id,
        today: isoDay(),
    });
    await tx.insert(transfers).values(
        picks.map((p) => ({
            requestId: request.id,
            medicationId: request.medicationId,
            batchId: p.batchId,
            quantity: p.quantity,
            fromPharmacyId: origin.id,
            toPharmacyId: request.pharmacyId,
        })),
    );
    const [medication] = await tx
        .select()
        .from(medications)
        .where(eq(medications.id, request.medicationId));
    const destination = await unitName(tx, request.pharmacyId);
    await notifyPharmacyStaff(tx, origin.id, {
        title: "Pedido de transferência",
        body: `A ${destination} pediu ${request.quantity} ${medication!.dispensingUnit} de ${medicationDisplayName(medication!)}.`,
        requestId: request.id,
    });
    await notifyPatient(
        tx,
        request,
        "Buscando seu remédio",
        `Pedimos o remédio à ${origin.name}. Avisaremos quando chegar.`,
    );
    void staff;
});

export interface TransferView {
    id: string;
    requestId: string | null;
    status: "requested" | "shipped" | "received" | "refused";
    quantity: number;
    medication: string;
    batchNumber: string;
    expiryDate: string;
    from: { id: string; name: string };
    to: { id: string; name: string };
    refusalReason: string | null;
    createdAt: string;
}

export async function listTransfers(
    db: Db,
    staff: Staff,
    direction?: "incoming" | "outgoing",
): Promise<TransferView[]> {
    const where =
        direction === "outgoing"
            ? eq(transfers.fromPharmacyId, staff.pharmacyId)
            : direction === "incoming"
              ? eq(transfers.toPharmacyId, staff.pharmacyId)
              : or(
                    eq(transfers.fromPharmacyId, staff.pharmacyId),
                    eq(transfers.toPharmacyId, staff.pharmacyId),
                );
    const rows = await db
        .select()
        .from(transfers)
        .where(where)
        .orderBy(desc(transfers.createdAt))
        .limit(200);
    if (rows.length === 0) return [];
    const unitIds = [...new Set(rows.flatMap((t) => [t.fromPharmacyId, t.toPharmacyId]))];
    const units = await db.select().from(pharmacies).where(inArray(pharmacies.id, unitIds));
    const meds = await db
        .select()
        .from(medications)
        .where(inArray(medications.id, [...new Set(rows.map((t) => t.medicationId))]));
    const batches = await db
        .select()
        .from(stockBatches)
        .where(
            inArray(
                stockBatches.id,
                rows.map((t) => t.batchId),
            ),
        );
    const name = (id: string) => units.find((u) => u.id === id)?.name ?? "";
    return rows.map((t) => {
        const b = batches.find((x) => x.id === t.batchId)!;
        return {
            id: t.id,
            requestId: t.requestId,
            status: t.status,
            quantity: t.quantity,
            medication: medicationDisplayName(meds.find((m) => m.id === t.medicationId)!),
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            from: { id: t.fromPharmacyId, name: name(t.fromPharmacyId) },
            to: { id: t.toPharmacyId, name: name(t.toPharmacyId) },
            refusalReason: t.refusalReason,
            createdAt: t.createdAt.toISOString(),
        };
    });
}

export type TransferAction =
    { action: "ship" } | { action: "refuse"; reason: string } | { action: "receive" };

export async function runTransferAction(
    db: Db,
    staff: Staff,
    transferId: string,
    body: TransferAction,
): Promise<TransferView> {
    await db.transaction(async (tx) => {
        const [t] = await tx
            .select()
            .from(transfers)
            .where(eq(transfers.id, transferId))
            .for("update");
        if (!t) throw new NotFoundError("Transferência não encontrada.");
        const request = t.requestId ? await lockRequest(tx, t.requestId) : null;
        const today = isoDay();

        if (body.action === "ship" || body.action === "refuse") {
            if (staff.pharmacyId !== t.fromPharmacyId)
                throw new ForbiddenError("Só a unidade de origem envia ou recusa.");
            if (t.status !== "requested")
                throw new ConflictError("Esta transferência já foi respondida.");
        }
        if (body.action === "ship") {
            if (request) {
                await consumeReservations(
                    tx,
                    request.id,
                    "exit_transfer",
                    staff.userId,
                    today,
                    t.batchId,
                );
            }
            await tx
                .update(transfers)
                .set({ status: "shipped", shippedAt: new Date() })
                .where(eq(transfers.id, t.id));
            await notifyPharmacyStaff(tx, t.toPharmacyId, {
                title: "Transferência enviada",
                body: `A ${await unitName(tx, t.fromPharmacyId)} enviou ${t.quantity} unidade(s). Confirme ao receber.`,
                requestId: t.requestId,
            });
        } else if (body.action === "refuse") {
            const siblings = request
                ? await tx
                      .select({ id: transfers.id })
                      .from(transfers)
                      .where(
                          and(
                              eq(transfers.requestId, request.id),
                              eq(transfers.status, "requested"),
                          ),
                      )
                : [{ id: t.id }];
            await tx
                .update(transfers)
                .set({ status: "refused", refusalReason: body.reason })
                .where(
                    inArray(
                        transfers.id,
                        siblings.map((s) => s.id),
                    ),
                );
            if (request) {
                await releaseReservations(tx, request.id, t.fromPharmacyId);
                await setStatus(tx, request, "requested", { sourcePharmacyId: null });
                const origin = await unitName(tx, t.fromPharmacyId);
                await notifyPharmacyStaff(tx, t.toPharmacyId, {
                    title: "Transferência recusada",
                    body: `A ${origin} não pôde enviar: ${body.reason}`,
                    requestId: request.id,
                });
                await notifyPatient(
                    tx,
                    request,
                    "Mudança no seu pedido",
                    `A ${origin} não pôde enviar; a farmácia vai buscar outra opção.`,
                );
            }
        } else {
            if (staff.pharmacyId !== t.toPharmacyId)
                throw new ForbiddenError("Só a unidade de destino confirma o recebimento.");
            if (t.status !== "shipped")
                throw new ConflictError("A transferência ainda não foi enviada.");
            const [origin] = await tx
                .select()
                .from(stockBatches)
                .where(eq(stockBatches.id, t.batchId));
            const newBatch = await addBatch(tx, {
                pharmacyId: t.toPharmacyId,
                medicationId: t.medicationId,
                batchNumber: origin!.batchNumber,
                expiryDate: origin!.expiryDate,
                quantity: t.quantity,
                movementType: "entry_transfer",
                staffUserId: staff.userId,
                relatedId: t.id,
                manufacturerCnpj: origin!.manufacturerCnpj,
                anvisaRegistration: origin!.anvisaRegistration,
            });
            await tx
                .update(transfers)
                .set({ status: "received", receivedAt: new Date() })
                .where(eq(transfers.id, t.id));
            if (request) {
                await reserveOnBatch(tx, newBatch, request.id, t.quantity);
                const pending = await tx
                    .select({ id: transfers.id })
                    .from(transfers)
                    .where(
                        and(
                            eq(transfers.requestId, request.id),
                            inArray(transfers.status, ["requested", "shipped"]),
                        ),
                    );
                if (pending.length === 0) {
                    await setStatus(tx, request, "arrived");
                    await notifyPatient(
                        tx,
                        request,
                        "Seu remédio chegou",
                        `Seu remédio chegou na ${await unitName(tx, t.toPharmacyId)}.`,
                    );
                }
            }
        }
    });
    const [view] = (await listTransfers(db, staff)).filter((v) => v.id === transferId);
    return view!;
}
