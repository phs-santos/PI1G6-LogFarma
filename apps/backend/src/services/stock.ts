// Estoque por lote, reservas e movimentos (modelo da BNAFAR). Funções recebem uma transação.
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import type { DbOrTx } from "../db/client.js";
import {
    purchaseOrders,
    stockBatches,
    stockItems,
    stockMovements,
    stockReservations,
    suppliers,
} from "../db/schema.js";
import { pickBatchesFefo } from "../domain/batches.js";
import { BadRequestError, ConflictError, NotFoundError } from "../domain/errors.js";
import { attachWaitingEntries } from "./purchasing.js";
import { isoDay } from "../domain/dates.js";

type ExitMovement = "exit_dispensation" | "exit_transfer";

export interface BatchStock {
    id: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    reserved: number;
    available: number;
}

export interface ReadOptions {
    /** true (padrão) para quem vai alterar o estoque; false para consultas (não espera travas). */
    lock?: boolean;
}

/** Lotes do par unidade+remédio, com o que já está reservado. Trava os lotes por padrão. */
export async function availableByBatch(
    tx: DbOrTx,
    pharmacyId: string,
    medicationId: string,
    options: ReadOptions = {},
): Promise<BatchStock[]> {
    const query = tx
        .select()
        .from(stockBatches)
        .where(
            and(
                eq(stockBatches.pharmacyId, pharmacyId),
                eq(stockBatches.medicationId, medicationId),
            ),
        )
        .orderBy(asc(stockBatches.expiryDate));
    const batches = options.lock === false ? await query : await query.for("update");
    if (batches.length === 0) return [];
    const reservedRows = await tx
        .select({
            batchId: stockReservations.batchId,
            reserved: sql<number>`sum(${stockReservations.quantity})::int`,
        })
        .from(stockReservations)
        .where(
            inArray(
                stockReservations.batchId,
                batches.map((b) => b.id),
            ),
        )
        .groupBy(stockReservations.batchId);
    const reservedBy = new Map(reservedRows.map((r) => [r.batchId, r.reserved]));
    return batches.map((b) => {
        const reserved = reservedBy.get(b.id) ?? 0;
        return {
            id: b.id,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            quantity: b.quantity,
            reserved,
            available: b.quantity - reserved,
        };
    });
}

/** Quantidade livre (sem reserva) em lotes não vencidos. */
export async function availableQuantity(
    tx: DbOrTx,
    pharmacyId: string,
    medicationId: string,
    today: string,
    options: ReadOptions = {},
): Promise<number> {
    const batches = await availableByBatch(tx, pharmacyId, medicationId, options);
    return batches
        .filter((b) => b.expiryDate >= today)
        .reduce((sum, b) => sum + Math.max(b.available, 0), 0);
}

async function touchStockItem(tx: DbOrTx, pharmacyId: string, medicationId: string): Promise<void> {
    await tx
        .insert(stockItems)
        .values({ pharmacyId, medicationId, minQuantity: 0 })
        .onConflictDoUpdate({
            target: [stockItems.pharmacyId, stockItems.medicationId],
            set: { updatedAt: new Date() },
        });
}

/** Separa (reserva) a quantidade para o pedido, do lote que vence primeiro. */
export async function reserve(
    tx: DbOrTx,
    input: {
        pharmacyId: string;
        medicationId: string;
        quantity: number;
        requestId: string;
        today: string;
    },
): Promise<{ batchId: string; quantity: number }[]> {
    const batches = await availableByBatch(tx, input.pharmacyId, input.medicationId);
    const picks = pickBatchesFefo(batches, input.quantity, input.today);
    if (!picks) {
        throw new ConflictError("Estoque insuficiente nesta unidade.");
    }
    await tx
        .insert(stockReservations)
        .values(picks.map((p) => ({ ...p, requestId: input.requestId })));
    return picks;
}

/** Reserva num lote específico (ex.: o lote que acabou de chegar por transferência ou compra). */
export async function reserveOnBatch(
    tx: DbOrTx,
    batchId: string,
    requestId: string,
    quantity: number,
): Promise<void> {
    await tx.insert(stockReservations).values({ batchId, requestId, quantity });
}

/** Desfaz as reservas do pedido (opcionalmente só as de uma unidade). */
export async function releaseReservations(
    tx: DbOrTx,
    requestId: string,
    pharmacyId?: string,
): Promise<void> {
    if (!pharmacyId) {
        await tx.delete(stockReservations).where(eq(stockReservations.requestId, requestId));
        return;
    }
    const batchIds = tx
        .select({ id: stockBatches.id })
        .from(stockBatches)
        .where(eq(stockBatches.pharmacyId, pharmacyId));
    await tx
        .delete(stockReservations)
        .where(
            and(
                eq(stockReservations.requestId, requestId),
                inArray(stockReservations.batchId, batchIds),
            ),
        );
}

/** Tira do estoque o que estava reservado para o pedido e registra o movimento. */
export async function consumeReservations(
    tx: DbOrTx,
    requestId: string,
    movementType: ExitMovement,
    staffUserId: string,
    today: string,
    onlyBatchId?: string,
): Promise<{ batchId: string; quantity: number }[]> {
    await replaceExpiredReservations(tx, requestId, today, onlyBatchId);
    const reservations = await tx
        .select({
            id: stockReservations.id,
            batchId: stockReservations.batchId,
            quantity: stockReservations.quantity,
            pharmacyId: stockBatches.pharmacyId,
            medicationId: stockBatches.medicationId,
        })
        .from(stockReservations)
        .innerJoin(stockBatches, eq(stockBatches.id, stockReservations.batchId))
        .where(
            onlyBatchId
                ? and(
                      eq(stockReservations.requestId, requestId),
                      eq(stockReservations.batchId, onlyBatchId),
                  )
                : eq(stockReservations.requestId, requestId),
        )
        .for("update");
    if (reservations.length === 0) {
        throw new ConflictError("Não há remédio separado para este pedido.");
    }
    const touched = new Map<string, { pharmacyId: string; medicationId: string }>();
    for (const r of reservations) {
        await tx
            .update(stockBatches)
            .set({ quantity: sql`${stockBatches.quantity} - ${r.quantity}` })
            .where(eq(stockBatches.id, r.batchId));
        await tx.delete(stockReservations).where(eq(stockReservations.id, r.id));
        await tx.insert(stockMovements).values({
            pharmacyId: r.pharmacyId,
            batchId: r.batchId,
            type: movementType,
            quantity: r.quantity,
            relatedId: requestId,
            staffUserId,
        });
        touched.set(`${r.pharmacyId}:${r.medicationId}`, {
            pharmacyId: r.pharmacyId,
            medicationId: r.medicationId,
        });
    }
    for (const t of touched.values()) {
        await touchStockItem(tx, t.pharmacyId, t.medicationId);
        await ensureReplenishment(tx, t.pharmacyId, t.medicationId, today);
    }
    return reservations.map((r) => ({ batchId: r.batchId, quantity: r.quantity }));
}

/**
 * Nunca sai lote vencido: se o lote separado venceu, troca por outro lote válido da mesma unidade
 * (o que vence primeiro). Sem lote válido suficiente, a ação é recusada.
 */
async function replaceExpiredReservations(
    tx: DbOrTx,
    requestId: string,
    today: string,
    onlyBatchId?: string,
): Promise<void> {
    const expired = await tx
        .select({
            id: stockReservations.id,
            quantity: stockReservations.quantity,
            batchId: stockReservations.batchId,
            pharmacyId: stockBatches.pharmacyId,
            medicationId: stockBatches.medicationId,
        })
        .from(stockReservations)
        .innerJoin(stockBatches, eq(stockBatches.id, stockReservations.batchId))
        .where(and(eq(stockReservations.requestId, requestId), lt(stockBatches.expiryDate, today)))
        .for("update");
    for (const r of expired) {
        if (onlyBatchId && r.batchId === onlyBatchId) {
            throw new ConflictError("O lote desta transferência venceu; recuse e peça de novo.");
        }
        await tx.delete(stockReservations).where(eq(stockReservations.id, r.id));
        try {
            await reserve(tx, {
                pharmacyId: r.pharmacyId,
                medicationId: r.medicationId,
                quantity: r.quantity,
                requestId,
                today,
            });
        } catch (err) {
            if (err instanceof ConflictError) {
                throw new ConflictError(
                    "O remédio separado venceu e não há outro lote válido na unidade.",
                );
            }
            throw err;
        }
    }
}

/** Entrada de estoque: cria o lote (ou soma no mesmo lote) e registra o movimento. */
export async function addBatch(
    tx: DbOrTx,
    input: {
        pharmacyId: string;
        medicationId: string;
        batchNumber: string;
        expiryDate: string;
        quantity: number;
        movementType: "entry_purchase" | "entry_transfer" | "adjustment";
        staffUserId: string | null;
        relatedId?: string;
        manufacturerCnpj?: string | null;
        anvisaRegistration?: string | null;
    },
): Promise<string> {
    if (input.quantity <= 0) {
        throw new BadRequestError("A quantidade precisa ser maior que zero.");
    }
    const [existing] = await tx
        .select()
        .from(stockBatches)
        .where(
            and(
                eq(stockBatches.pharmacyId, input.pharmacyId),
                eq(stockBatches.medicationId, input.medicationId),
                eq(stockBatches.batchNumber, input.batchNumber),
            ),
        )
        .for("update");
    let batchId: string;
    if (existing) {
        if (existing.expiryDate !== input.expiryDate) {
            throw new ConflictError(`O lote ${input.batchNumber} já existe com outra validade.`);
        }
        await tx
            .update(stockBatches)
            .set({ quantity: sql`${stockBatches.quantity} + ${input.quantity}` })
            .where(eq(stockBatches.id, existing.id));
        batchId = existing.id;
    } else {
        const [created] = await tx
            .insert(stockBatches)
            .values({
                pharmacyId: input.pharmacyId,
                medicationId: input.medicationId,
                batchNumber: input.batchNumber,
                expiryDate: input.expiryDate,
                quantity: input.quantity,
                manufacturerCnpj: input.manufacturerCnpj ?? null,
                anvisaRegistration: input.anvisaRegistration ?? null,
            })
            .returning({ id: stockBatches.id });
        batchId = created!.id;
    }
    await tx.insert(stockMovements).values({
        pharmacyId: input.pharmacyId,
        batchId,
        type: input.movementType,
        quantity: input.quantity,
        relatedId: input.relatedId ?? null,
        staffUserId: input.staffUserId,
    });
    await touchStockItem(tx, input.pharmacyId, input.medicationId);
    return batchId;
}

/** Ajuste ou perda (ex.: lote vencido). Nunca abaixo de zero nem abaixo do reservado. */
export async function adjustBatch(
    tx: DbOrTx,
    input: {
        batchId: string;
        delta: number;
        reason: "exit_loss" | "adjustment";
        staffUserId: string;
    },
): Promise<void> {
    const [batch] = await tx
        .select()
        .from(stockBatches)
        .where(eq(stockBatches.id, input.batchId))
        .for("update");
    if (!batch) throw new NotFoundError("Lote não encontrado.");
    if (input.reason === "exit_loss" && batch.expiryDate < isoDay()) {
        // Lote vencido pode ser baixado: as reservas nele são liberadas e trocadas na hora da saída.
        await tx.delete(stockReservations).where(eq(stockReservations.batchId, batch.id));
    }
    const [stock] = (await availableByBatch(tx, batch.pharmacyId, batch.medicationId)).filter(
        (b) => b.id === batch.id,
    );
    const newQuantity = batch.quantity + input.delta;
    if (newQuantity < 0 || newQuantity < (stock?.reserved ?? 0)) {
        throw new ConflictError(
            "O ajuste deixaria o lote abaixo do que já está separado para pedidos.",
        );
    }
    await tx
        .update(stockBatches)
        .set({ quantity: newQuantity })
        .where(eq(stockBatches.id, batch.id));
    await tx.insert(stockMovements).values({
        pharmacyId: batch.pharmacyId,
        batchId: batch.id,
        type: input.reason,
        quantity: Math.abs(input.delta),
        staffUserId: input.staffUserId,
    });
    await touchStockItem(tx, batch.pharmacyId, batch.medicationId);
}

const OPEN_PURCHASE = ["placed", "confirmed", "no_date", "shipped"] as const;

/** Reposição em paralelo: abaixo do mínimo e sem compra aberta → cria pedido automático. */
export async function ensureReplenishment(
    tx: DbOrTx,
    pharmacyId: string,
    medicationId: string,
    today: string,
): Promise<void> {
    const [item] = await tx
        .select()
        .from(stockItems)
        .where(
            and(eq(stockItems.pharmacyId, pharmacyId), eq(stockItems.medicationId, medicationId)),
        );
    if (!item || item.minQuantity <= 0) return;
    const available = await availableQuantity(tx, pharmacyId, medicationId, today);
    if (available >= item.minQuantity) return;
    const [open] = await tx
        .select({ id: purchaseOrders.id })
        .from(purchaseOrders)
        .where(
            and(
                eq(purchaseOrders.pharmacyId, pharmacyId),
                eq(purchaseOrders.medicationId, medicationId),
                inArray(purchaseOrders.status, [...OPEN_PURCHASE]),
            ),
        );
    if (open) return;
    const [supplier] = await tx
        .select({ id: suppliers.id })
        .from(suppliers)
        .orderBy(asc(suppliers.createdAt))
        .limit(1);
    if (!supplier) return;
    const [order] = await tx
        .insert(purchaseOrders)
        .values({
            pharmacyId,
            medicationId,
            supplierId: supplier.id,
            quantity: item.minQuantity * 2 - available,
            origin: "auto_min_stock",
        })
        .returning({ id: purchaseOrders.id });
    await attachWaitingEntries(tx, order!.id);
}

export const OPEN_PURCHASE_STATUSES = OPEN_PURCHASE;
