// RF04, RF05, RF06 — pedido de compra ao fornecedor e lista de espera com prioridade.
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db, DbOrTx, Tx } from "../db/client.js";
import {
    medicationRequests,
    medications,
    patientPriorities,
    patients,
    pharmacies,
    purchaseOrders,
    suppliers,
    waitlistEntries,
} from "../db/schema.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../domain/errors.js";
import { ageOn, isoDay } from "../domain/dates.js";
import { compareWaitlist, computePriority } from "../domain/priority.js";
import { medicationDisplayName } from "../domain/medication-name.js";
import type { PriorityCategory } from "../contracts.js";

const ATTACHABLE = ["placed", "confirmed", "no_date"] as const;

function brDate(iso: string): string {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
}

/** Categoria clínica válida (com consentimento e não revogada) do paciente. */
export async function activeCategory(
    tx: DbOrTx,
    patientId: string,
): Promise<PriorityCategory | null> {
    const [row] = await tx
        .select()
        .from(patientPriorities)
        .where(and(eq(patientPriorities.patientId, patientId), isNull(patientPriorities.revokedAt)))
        .orderBy(desc(patientPriorities.declaredAt))
        .limit(1);
    return row?.category ?? null;
}

export async function currentPriority(tx: DbOrTx, patientId: string, today: Date): Promise<number> {
    const [patient] = await tx.select().from(patients).where(eq(patients.userId, patientId));
    if (!patient) throw new NotFoundError("Paciente não encontrado.");
    return computePriority(
        { category: await activeCategory(tx, patientId), birthDate: patient.birthDate },
        today,
    );
}

/** Recalcula a prioridade das entradas em espera do paciente (ex.: retirou o consentimento). */
export async function recalculateWaitlist(
    tx: DbOrTx,
    patientId: string,
    today: Date,
): Promise<void> {
    const priority = await currentPriority(tx, patientId, today);
    await tx
        .update(waitlistEntries)
        .set({ priority })
        .where(
            and(eq(waitlistEntries.patientId, patientId), eq(waitlistEntries.status, "waiting")),
        );
}

/** Liga ao pedido de compra as entradas em espera sem pedido do mesmo par unidade+remédio. */
export async function attachWaitingEntries(tx: DbOrTx, purchaseOrderId: string): Promise<void> {
    const [po] = await tx
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, purchaseOrderId));
    if (!po) return;
    const loose = await tx
        .select({ id: waitlistEntries.id, quantity: medicationRequests.quantity })
        .from(waitlistEntries)
        .innerJoin(medicationRequests, eq(medicationRequests.id, waitlistEntries.requestId))
        .where(
            and(
                eq(waitlistEntries.pharmacyId, po.pharmacyId),
                eq(waitlistEntries.medicationId, po.medicationId),
                eq(waitlistEntries.status, "waiting"),
                isNull(waitlistEntries.purchaseOrderId),
            ),
        );
    if (loose.length === 0) return;
    await tx
        .update(waitlistEntries)
        .set({ purchaseOrderId: po.id })
        .where(
            inArray(
                waitlistEntries.id,
                loose.map((e) => e.id),
            ),
        );
    const extra = loose.reduce((sum, e) => sum + e.quantity, 0);
    await tx
        .update(purchaseOrders)
        .set({ quantity: sql`${purchaseOrders.quantity} + ${extra}` })
        .where(eq(purchaseOrders.id, po.id));
}

/** Ordem da fila de espera de um remédio numa unidade (1 = próximo). */
export async function waitlistQueue(tx: DbOrTx, pharmacyId: string, medicationId: string) {
    const entries = await tx
        .select()
        .from(waitlistEntries)
        .where(
            and(
                eq(waitlistEntries.pharmacyId, pharmacyId),
                eq(waitlistEntries.medicationId, medicationId),
                eq(waitlistEntries.status, "waiting"),
            ),
        );
    return entries.sort(compareWaitlist);
}

/** A rede pública inteira tem o remédio? (se tiver, o caminho é transferência, não compra) */
async function networkHas(
    tx: Tx,
    medicationId: string,
    quantity: number,
    specialized: boolean,
): Promise<boolean> {
    const { availableQuantity } = await import("./stock.js");
    const kinds = specialized
        ? ["specialized_pharmacy" as const]
        : (["ubs", "municipal_pharmacy"] as const);
    const units = await tx
        .select({ id: pharmacies.id })
        .from(pharmacies)
        .where(inArray(pharmacies.kind, [...kinds]));
    const today = isoDay();
    for (const unit of units) {
        if ((await availableQuantity(tx, unit.id, medicationId, today)) >= quantity) return true;
    }
    return false;
}

/** Ação do balcão "order_from_supplier": coloca o pedido na fila e no pedido de compra. */
export async function orderFromSupplier(
    tx: Tx,
    request: typeof medicationRequests.$inferSelect,
    supplierId: string | undefined,
): Promise<{ purchaseOrderId: string; supplierId: string; created: boolean }> {
    const [medication] = await tx
        .select()
        .from(medications)
        .where(eq(medications.id, request.medicationId));
    if (
        await networkHas(
            tx,
            request.medicationId,
            request.quantity,
            medication!.component === "specialized",
        )
    ) {
        throw new ConflictError("Há estoque na rede: use transferência.");
    }
    const [open] = await tx
        .select()
        .from(purchaseOrders)
        .where(
            and(
                eq(purchaseOrders.pharmacyId, request.pharmacyId),
                eq(purchaseOrders.medicationId, request.medicationId),
                inArray(purchaseOrders.status, [...ATTACHABLE]),
            ),
        )
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(1)
        .for("update");
    let po = open;
    let created = false;
    if (!po) {
        if (!supplierId)
            throw new BadRequestError("Informe o fornecedor para o novo pedido de compra.");
        const [supplier] = await tx.select().from(suppliers).where(eq(suppliers.id, supplierId));
        if (!supplier) throw new NotFoundError("Fornecedor não encontrado.");
        [po] = await tx
            .insert(purchaseOrders)
            .values({
                pharmacyId: request.pharmacyId,
                medicationId: request.medicationId,
                supplierId,
                quantity: 0,
                origin: "manual",
            })
            .returning();
        created = true;
    }
    const priority = await currentPriority(tx, request.patientId, new Date());
    await tx.insert(waitlistEntries).values({
        requestId: request.id,
        patientId: request.patientId,
        medicationId: request.medicationId,
        pharmacyId: request.pharmacyId,
        purchaseOrderId: po!.id,
        priority,
    });
    await tx
        .update(purchaseOrders)
        .set({ quantity: sql`${purchaseOrders.quantity} + ${request.quantity}` })
        .where(eq(purchaseOrders.id, po!.id));
    if (created) await attachWaitingEntries(tx, po!.id);
    return { purchaseOrderId: po!.id, supplierId: po!.supplierId, created };
}

// ---------- visões ----------

export interface PurchaseOrderView {
    id: string;
    status: "placed" | "confirmed" | "no_date" | "shipped" | "received";
    origin: "manual" | "auto_min_stock";
    medication: string;
    quantity: number;
    pharmacy: { id: string; name: string; address: string };
    supplier: { id: string; name: string };
    expectedAt: string | null;
    invoiceNumber: string | null;
    shippedBatchNumber: string | null;
    shippedExpiryDate: string | null;
    shippedQuantity: number | null;
    waitingPatients: number;
    createdAt: string;
}

export async function purchaseOrderViews(
    db: DbOrTx,
    where: ReturnType<typeof eq>,
): Promise<PurchaseOrderView[]> {
    const rows = await db
        .select()
        .from(purchaseOrders)
        .where(where)
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(200);
    if (rows.length === 0) return [];
    const meds = await db
        .select()
        .from(medications)
        .where(inArray(medications.id, [...new Set(rows.map((r) => r.medicationId))]));
    const units = await db
        .select()
        .from(pharmacies)
        .where(inArray(pharmacies.id, [...new Set(rows.map((r) => r.pharmacyId))]));
    const sups = await db
        .select()
        .from(suppliers)
        .where(inArray(suppliers.id, [...new Set(rows.map((r) => r.supplierId))]));
    const waiting = await db
        .select({ po: waitlistEntries.purchaseOrderId, n: sql<number>`count(*)::int` })
        .from(waitlistEntries)
        .where(
            and(
                inArray(
                    waitlistEntries.purchaseOrderId,
                    rows.map((r) => r.id),
                ),
                eq(waitlistEntries.status, "waiting"),
            ),
        )
        .groupBy(waitlistEntries.purchaseOrderId);
    return rows.map((r) => {
        const unit = units.find((u) => u.id === r.pharmacyId)!;
        const sup = sups.find((s) => s.id === r.supplierId)!;
        return {
            id: r.id,
            status: r.status,
            origin: r.origin,
            medication: medicationDisplayName(meds.find((m) => m.id === r.medicationId)!),
            quantity: r.quantity,
            pharmacy: { id: unit.id, name: unit.name, address: unit.address },
            supplier: { id: sup.id, name: sup.name },
            expectedAt: r.expectedAt,
            invoiceNumber: r.invoiceNumber,
            shippedBatchNumber: r.shippedBatchNumber,
            shippedExpiryDate: r.shippedExpiryDate,
            shippedQuantity: r.shippedQuantity,
            waitingPatients: waiting.find((w) => w.po === r.id)?.n ?? 0,
            createdAt: r.createdAt.toISOString(),
        };
    });
}

export interface WaitlistItem {
    position: number;
    requestId: string;
    patientName: string;
    category: PriorityCategory | null;
    ageGroup: "80+" | "60+" | null;
    quantity: number;
    createdAt: string;
}

export async function waitlistView(
    db: DbOrTx,
    pharmacyId: string,
    medicationId: string,
): Promise<WaitlistItem[]> {
    const queue = await waitlistQueue(db, pharmacyId, medicationId);
    if (queue.length === 0) return [];
    const people = await db
        .select()
        .from(patients)
        .where(
            inArray(
                patients.userId,
                queue.map((e) => e.patientId),
            ),
        );
    const reqs = await db
        .select()
        .from(medicationRequests)
        .where(
            inArray(
                medicationRequests.id,
                queue.map((e) => e.requestId),
            ),
        );
    const today = isoDay();
    return Promise.all(
        queue.map(async (e, i) => {
            const p = people.find((x) => x.userId === e.patientId)!;
            const age = ageOn(p.birthDate, today);
            return {
                position: i + 1,
                requestId: e.requestId,
                patientName: p.socialName ?? p.fullName,
                category: await activeCategory(db, p.userId),
                ageGroup: age >= 80 ? "80+" : age >= 60 ? "60+" : null,
                quantity: reqs.find((r) => r.id === e.requestId)!.quantity,
                createdAt: e.createdAt.toISOString(),
            };
        }),
    );
}

// ---------- fornecedor ----------

export type SupplierAction =
    | { action: "confirm"; expectedAt: string }
    | { action: "no_date" }
    | {
          action: "ship";
          invoiceNumber: string;
          batchNumber: string;
          expiryDate: string;
          quantity: number;
      };

export async function runSupplierAction(
    db: Db,
    supplierId: string,
    purchaseOrderId: string,
    body: SupplierAction,
): Promise<PurchaseOrderView> {
    const { notify, notifyPharmacyStaff } = await import("./notifications.js");
    await db.transaction(async (tx) => {
        const [po] = await tx
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, purchaseOrderId))
            .for("update");
        if (!po || po.supplierId !== supplierId)
            throw new NotFoundError("Pedido de compra não encontrado.");
        const today = isoDay();
        const [medication] = await tx
            .select()
            .from(medications)
            .where(eq(medications.id, po.medicationId));
        const medName = medicationDisplayName(medication!);
        const waiting = await tx
            .select()
            .from(waitlistEntries)
            .where(
                and(
                    eq(waitlistEntries.purchaseOrderId, po.id),
                    eq(waitlistEntries.status, "waiting"),
                ),
            );

        if (body.action === "confirm") {
            if (!["placed", "no_date", "confirmed"].includes(po.status))
                throw new ConflictError("Este pedido já foi enviado.");
            if (body.expectedAt < today)
                throw new BadRequestError("A previsão não pode ser no passado.");
            await tx
                .update(purchaseOrders)
                .set({ status: "confirmed", expectedAt: body.expectedAt })
                .where(eq(purchaseOrders.id, po.id));
            if (waiting.length > 0) {
                await tx
                    .update(medicationRequests)
                    .set({ expectedAt: body.expectedAt, updatedAt: new Date() })
                    .where(
                        inArray(
                            medicationRequests.id,
                            waiting.map((w) => w.requestId),
                        ),
                    );
            }
            for (const w of waiting) {
                await notify(tx, {
                    userId: w.patientId,
                    requestId: w.requestId,
                    title: "Previsão de chegada",
                    body: `Previsão de chegada do seu remédio: ${brDate(body.expectedAt)}. Você continua na lista de espera.`,
                });
            }
            await notifyPharmacyStaff(tx, po.pharmacyId, {
                title: "Fornecedor confirmou prazo",
                body: `${medName}: previsão ${brDate(body.expectedAt)}.`,
            });
        } else if (body.action === "no_date") {
            if (!["placed", "confirmed", "no_date"].includes(po.status))
                throw new ConflictError("Este pedido já foi enviado.");
            await tx
                .update(purchaseOrders)
                .set({ status: "no_date", expectedAt: null })
                .where(eq(purchaseOrders.id, po.id));
            for (const w of waiting) {
                await notify(tx, {
                    userId: w.patientId,
                    requestId: w.requestId,
                    title: "Ainda sem previsão",
                    body: "O fornecedor ainda não tem prazo; você continua na lista de espera e será avisado.",
                });
            }
            await notifyPharmacyStaff(tx, po.pharmacyId, {
                title: "Fornecedor sem prazo",
                body: `${medName}: o fornecedor ainda não tem prazo.`,
            });
        } else {
            if (!["placed", "confirmed", "no_date"].includes(po.status))
                throw new ConflictError("Este pedido já foi enviado.");
            if (body.expiryDate <= today)
                throw new BadRequestError("A validade do lote precisa ser futura.");
            await tx
                .update(purchaseOrders)
                .set({
                    status: "shipped",
                    invoiceNumber: body.invoiceNumber,
                    shippedBatchNumber: body.batchNumber,
                    shippedExpiryDate: body.expiryDate,
                    shippedQuantity: body.quantity,
                    shippedAt: new Date(),
                })
                .where(eq(purchaseOrders.id, po.id));
            await notifyPharmacyStaff(tx, po.pharmacyId, {
                title: "Compra enviada",
                body: `${medName}: ${body.quantity} unidade(s) a caminho (nota ${body.invoiceNumber}). Confirme ao receber.`,
            });
        }
    });
    const [view] = await purchaseOrderViews(db, eq(purchaseOrders.id, purchaseOrderId));
    return view!;
}

// ---------- recebimento pela farmácia ----------

export async function receivePurchaseOrder(
    db: Db,
    staff: { userId: string; pharmacyId: string },
    purchaseOrderId: string,
): Promise<PurchaseOrderView> {
    const { addBatch, reserveOnBatch } = await import("./stock.js");
    const { lockRequest, notifyPatient, setStatus } = await import("./requests.js");
    await db.transaction(async (tx) => {
        const [po] = await tx
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, purchaseOrderId))
            .for("update");
        if (!po) throw new NotFoundError("Pedido de compra não encontrado.");
        if (po.pharmacyId !== staff.pharmacyId)
            throw new ForbiddenError("Este pedido de compra é de outra unidade.");
        if (po.status !== "shipped")
            throw new ConflictError("O fornecedor ainda não enviou este pedido.");
        const batchId = await addBatch(tx, {
            pharmacyId: po.pharmacyId,
            medicationId: po.medicationId,
            batchNumber: po.shippedBatchNumber!,
            expiryDate: po.shippedExpiryDate!,
            quantity: po.shippedQuantity!,
            movementType: "entry_purchase",
            staffUserId: staff.userId,
            relatedId: po.id,
        });
        await tx
            .update(purchaseOrders)
            .set({ status: "received", receivedAt: new Date() })
            .where(eq(purchaseOrders.id, po.id));

        // Fila por prioridade: atende inteiro enquanto houver; não pula ninguém na frente.
        const [unit] = await tx
            .select({ name: pharmacies.name })
            .from(pharmacies)
            .where(eq(pharmacies.id, po.pharmacyId));
        const queue = (await waitlistQueue(tx, po.pharmacyId, po.medicationId)).filter(
            (e) => e.purchaseOrderId === po.id || e.purchaseOrderId === null,
        );
        let remaining = po.shippedQuantity!;
        for (const entry of queue) {
            const request = await lockRequest(tx, entry.requestId);
            if (request.quantity > remaining) break;
            await reserveOnBatch(tx, batchId, request.id, request.quantity);
            await tx
                .update(waitlistEntries)
                .set({ status: "served" })
                .where(eq(waitlistEntries.id, entry.id));
            await setStatus(tx, request, "arrived");
            await notifyPatient(
                tx,
                request,
                "Seu remédio chegou",
                `Seu remédio chegou na ${unit!.name}.`,
            );
            remaining -= request.quantity;
        }
        await tx
            .update(waitlistEntries)
            .set({ purchaseOrderId: null })
            .where(
                and(
                    eq(waitlistEntries.purchaseOrderId, po.id),
                    eq(waitlistEntries.status, "waiting"),
                ),
            );
    });
    const [view] = await purchaseOrderViews(db, eq(purchaseOrders.id, purchaseOrderId));
    return view!;
}
