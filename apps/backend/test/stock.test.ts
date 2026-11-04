import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
    purchaseOrders,
    stockBatches,
    stockItems,
    stockMovements,
    stockReservations,
} from "../src/db/schema.js";
import { adjustBatch, consumeReservations, reserve } from "../src/services/stock.js";
import { ConflictError } from "../src/domain/errors.js";
import {
    createBatch,
    createMedication,
    createPatient,
    createPharmacy,
    createRequestRow,
    createStaff,
    createSupplier,
    resetDb,
    testDb,
} from "./helpers.js";

const today = "2026-11-03";

async function scenario() {
    const ubs = await createPharmacy();
    const med = await createMedication();
    const patient = await createPatient(ubs.id);
    const staff = await createStaff(ubs.id);
    const request = await createRequestRow({
        patientId: patient.id,
        medicationId: med.id,
        pharmacyId: ubs.id,
        quantity: 4,
    });
    return { ubs, med, patient, staff, request };
}

describe("estoque por lote", () => {
    beforeEach(() => resetDb());

    it("reserve escolhe o lote que vence primeiro e respeita reservas existentes", async () => {
        const { ubs, med, request, patient } = await scenario();
        const late = await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L-TARDE",
            expiryDate: "2027-06-01",
            quantity: 10,
        });
        const early = await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L-CEDO",
            expiryDate: "2027-01-01",
            quantity: 5,
        });
        const other = await createRequestRow({
            patientId: patient.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            quantity: 3,
        });
        await testDb.transaction((tx) =>
            reserve(tx, {
                pharmacyId: ubs.id,
                medicationId: med.id,
                quantity: 3,
                requestId: other.id,
                today,
            }),
        );
        const picks = await testDb.transaction((tx) =>
            reserve(tx, {
                pharmacyId: ubs.id,
                medicationId: med.id,
                quantity: 4,
                requestId: request.id,
                today,
            }),
        );
        expect(picks).toEqual([
            { batchId: early.id, quantity: 2 },
            { batchId: late.id, quantity: 2 },
        ]);
    });

    it("reserve com estoque insuficiente lança 409 e não reserva nada", async () => {
        const { ubs, med, request } = await scenario();
        await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L1",
            expiryDate: "2027-01-01",
            quantity: 3,
        });
        await expect(
            testDb.transaction((tx) =>
                reserve(tx, {
                    pharmacyId: ubs.id,
                    medicationId: med.id,
                    quantity: 4,
                    requestId: request.id,
                    today,
                }),
            ),
        ).rejects.toBeInstanceOf(ConflictError);
        expect(await testDb.select().from(stockReservations)).toHaveLength(0);
    });

    it("consumeReservations baixa o lote, grava movimento exit_dispensation e atualiza updatedAt", async () => {
        const { ubs, med, request, staff } = await scenario();
        const batch = await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L1",
            expiryDate: "2027-01-01",
            quantity: 10,
        });
        await testDb.update(stockItems).set({ updatedAt: new Date("2026-01-01T00:00:00Z") });
        await testDb.transaction((tx) =>
            reserve(tx, {
                pharmacyId: ubs.id,
                medicationId: med.id,
                quantity: 4,
                requestId: request.id,
                today,
            }),
        );
        const consumed = await testDb.transaction((tx) =>
            consumeReservations(tx, request.id, "exit_dispensation", staff.id, today),
        );
        expect(consumed).toEqual([{ batchId: batch.id, quantity: 4 }]);
        const [after] = await testDb
            .select()
            .from(stockBatches)
            .where(eq(stockBatches.id, batch.id));
        expect(after!.quantity).toBe(6);
        expect(await testDb.select().from(stockReservations)).toHaveLength(0);
        const movements = await testDb.select().from(stockMovements);
        expect(movements).toMatchObject([
            { type: "exit_dispensation", quantity: 4, batchId: batch.id, relatedId: request.id },
        ]);
        const [item] = await testDb.select().from(stockItems);
        expect(item!.updatedAt.getTime()).toBeGreaterThan(new Date("2026-06-01").getTime());
    });

    it("estoque abaixo do mínimo cria um PurchaseOrder auto_min_stock e não cria outro se já há um aberto", async () => {
        const { ubs, med, request, staff, patient } = await scenario();
        await createSupplier();
        await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L1",
            expiryDate: "2027-01-01",
            quantity: 12,
            minQuantity: 10,
        });
        await testDb.transaction(async (tx) => {
            await reserve(tx, {
                pharmacyId: ubs.id,
                medicationId: med.id,
                quantity: 4,
                requestId: request.id,
                today,
            });
            await consumeReservations(tx, request.id, "exit_dispensation", staff.id, today);
        });
        const second = await createRequestRow({
            patientId: patient.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            quantity: 1,
        });
        await testDb.transaction(async (tx) => {
            await reserve(tx, {
                pharmacyId: ubs.id,
                medicationId: med.id,
                quantity: 1,
                requestId: second.id,
                today,
            });
            await consumeReservations(tx, second.id, "exit_dispensation", staff.id, today);
        });
        const orders = await testDb
            .select()
            .from(purchaseOrders)
            .where(
                and(eq(purchaseOrders.pharmacyId, ubs.id), eq(purchaseOrders.medicationId, med.id)),
            );
        expect(orders).toHaveLength(1);
        expect(orders[0]).toMatchObject({
            origin: "auto_min_stock",
            status: "placed",
            quantity: 12,
        });
    });

    it("adjustBatch não deixa ficar abaixo do reservado (409)", async () => {
        const { ubs, med, request, staff } = await scenario();
        const batch = await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L1",
            expiryDate: "2027-01-01",
            quantity: 5,
        });
        await testDb.transaction((tx) =>
            reserve(tx, {
                pharmacyId: ubs.id,
                medicationId: med.id,
                quantity: 4,
                requestId: request.id,
                today,
            }),
        );
        await expect(
            testDb.transaction((tx) =>
                adjustBatch(tx, {
                    batchId: batch.id,
                    delta: -2,
                    reason: "exit_loss",
                    staffUserId: staff.id,
                }),
            ),
        ).rejects.toBeInstanceOf(ConflictError);
    });
});
