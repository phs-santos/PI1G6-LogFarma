// Painéis do gestor (só números agregados, sem dado de paciente) e estoque da unidade.
import { and, asc, desc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import type { DbOrTx } from "../db/client.js";
import {
    medications,
    pharmacies,
    searchEvents,
    stockBatches,
    stockItems,
    stockReservations,
} from "../db/schema.js";
import { addDays, isoDay } from "../domain/dates.js";
import { medicationDisplayName } from "../domain/medication-name.js";
import { toMedicationSummary, type MedicationSummary } from "./medications.js";

export interface UnmetDemandItem {
    medicationId: string;
    displayName: string;
    pharmacyId: string;
    pharmacyName: string;
    searches: number;
}

export async function unmetDemand(db: DbOrTx, from: Date, to: Date): Promise<UnmetDemandItem[]> {
    const rows = await db
        .select({
            medicationId: searchEvents.medicationId,
            pharmacyId: searchEvents.pharmacyId,
            searches: sql<number>`count(*)::int`,
        })
        .from(searchEvents)
        .where(
            and(
                eq(searchEvents.foundInNetwork, false),
                gte(searchEvents.createdAt, from),
                lte(searchEvents.createdAt, to),
            ),
        )
        .groupBy(searchEvents.medicationId, searchEvents.pharmacyId)
        .orderBy(desc(sql`count(*)`));
    if (rows.length === 0) return [];
    const meds = await db
        .select()
        .from(medications)
        .where(
            inArray(
                medications.id,
                rows.map((r) => r.medicationId),
            ),
        );
    const units = await db
        .select()
        .from(pharmacies)
        .where(
            inArray(
                pharmacies.id,
                rows.map((r) => r.pharmacyId),
            ),
        );
    return rows.map((r) => ({
        ...r,
        displayName: medicationDisplayName(meds.find((m) => m.id === r.medicationId)!),
        pharmacyName: units.find((u) => u.id === r.pharmacyId)!.name,
    }));
}

export interface ExpiringBatch {
    pharmacyName: string;
    displayName: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
}

export async function expiringStock(db: DbOrTx, days: number): Promise<ExpiringBatch[]> {
    const today = isoDay();
    const rows = await db
        .select({
            pharmacyName: pharmacies.name,
            medication: medications,
            batchNumber: stockBatches.batchNumber,
            expiryDate: stockBatches.expiryDate,
            quantity: stockBatches.quantity,
        })
        .from(stockBatches)
        .innerJoin(pharmacies, eq(pharmacies.id, stockBatches.pharmacyId))
        .innerJoin(medications, eq(medications.id, stockBatches.medicationId))
        .where(
            and(gt(stockBatches.quantity, 0), lte(stockBatches.expiryDate, addDays(today, days))),
        )
        .orderBy(asc(stockBatches.expiryDate));
    return rows.map((r) => ({
        pharmacyName: r.pharmacyName,
        displayName: medicationDisplayName(r.medication),
        batchNumber: r.batchNumber,
        expiryDate: r.expiryDate,
        quantity: r.quantity,
    }));
}

export interface UnitStockItem {
    medication: MedicationSummary;
    available: number;
    reserved: number;
    minQuantity: number;
    updatedAt: string;
    batches: {
        id: string;
        batchNumber: string;
        expiryDate: string;
        quantity: number;
        reserved: number;
    }[];
}

export async function unitStock(db: DbOrTx, pharmacyId: string): Promise<UnitStockItem[]> {
    const items = await db.select().from(stockItems).where(eq(stockItems.pharmacyId, pharmacyId));
    if (items.length === 0) return [];
    const meds = await db
        .select()
        .from(medications)
        .where(
            inArray(
                medications.id,
                items.map((i) => i.medicationId),
            ),
        );
    const batches = await db
        .select()
        .from(stockBatches)
        .where(eq(stockBatches.pharmacyId, pharmacyId))
        .orderBy(asc(stockBatches.expiryDate));
    const reserved = batches.length
        ? await db
              .select({
                  batchId: stockReservations.batchId,
                  total: sql<number>`sum(${stockReservations.quantity})::int`,
              })
              .from(stockReservations)
              .where(
                  inArray(
                      stockReservations.batchId,
                      batches.map((b) => b.id),
                  ),
              )
              .groupBy(stockReservations.batchId)
        : [];
    const today = isoDay();
    return items
        .map((item) => {
            const own = batches
                .filter((b) => b.medicationId === item.medicationId)
                .map((b) => ({
                    id: b.id,
                    batchNumber: b.batchNumber,
                    expiryDate: b.expiryDate,
                    quantity: b.quantity,
                    reserved: reserved.find((r) => r.batchId === b.id)?.total ?? 0,
                }));
            const usable = own.filter((b) => b.expiryDate >= today);
            return {
                medication: toMedicationSummary(meds.find((m) => m.id === item.medicationId)!),
                available: usable.reduce((s, b) => s + b.quantity - b.reserved, 0),
                reserved: own.reduce((s, b) => s + b.reserved, 0),
                minQuantity: item.minQuantity,
                updatedAt: item.updatedAt.toISOString(),
                batches: own,
            };
        })
        .sort((a, b) => a.medication.displayName.localeCompare(b.medication.displayName, "pt-BR"));
}

export async function setMinQuantity(
    db: DbOrTx,
    pharmacyId: string,
    medicationId: string,
    minQuantity: number,
): Promise<void> {
    await db
        .insert(stockItems)
        .values({ pharmacyId, medicationId, minQuantity })
        .onConflictDoUpdate({
            target: [stockItems.pharmacyId, stockItems.medicationId],
            set: { minQuantity },
        });
}
