// Avisos dentro do app (RF05). Texto simples e sem dado clínico ou documento.
import { eq } from "drizzle-orm";
import type { DbOrTx } from "../db/client.js";
import { couriers, notifications, pharmacyStaff, supplierStaff } from "../db/schema.js";

export interface Message {
    title: string;
    body: string;
    requestId?: string | null;
}

export async function notify(tx: DbOrTx, input: Message & { userId: string }): Promise<void> {
    await tx.insert(notifications).values({
        userId: input.userId,
        title: input.title,
        body: input.body,
        requestId: input.requestId ?? null,
    });
}

async function notifyMany(tx: DbOrTx, userIds: string[], msg: Message): Promise<void> {
    if (userIds.length === 0) return;
    await tx.insert(notifications).values(
        userIds.map((userId) => ({
            userId,
            title: msg.title,
            body: msg.body,
            requestId: msg.requestId ?? null,
        })),
    );
}

export async function notifyPharmacyStaff(
    tx: DbOrTx,
    pharmacyId: string,
    msg: Message,
): Promise<void> {
    const rows = await tx
        .select({ id: pharmacyStaff.userId })
        .from(pharmacyStaff)
        .where(eq(pharmacyStaff.pharmacyId, pharmacyId));
    await notifyMany(
        tx,
        rows.map((r) => r.id),
        msg,
    );
}

export async function notifySupplierStaff(
    tx: DbOrTx,
    supplierId: string,
    msg: Message,
): Promise<void> {
    const rows = await tx
        .select({ id: supplierStaff.userId })
        .from(supplierStaff)
        .where(eq(supplierStaff.supplierId, supplierId));
    await notifyMany(
        tx,
        rows.map((r) => r.id),
        msg,
    );
}

/** Um entregador específico ou todos os entregadores do programa. */
export async function notifyCouriers(
    tx: DbOrTx,
    msg: Message,
    courierId?: string | null,
): Promise<void> {
    if (courierId) {
        await notify(tx, { ...msg, userId: courierId });
        return;
    }
    const rows = await tx.select({ id: couriers.userId }).from(couriers);
    await notifyMany(
        tx,
        rows.map((r) => r.id),
        msg,
    );
}
