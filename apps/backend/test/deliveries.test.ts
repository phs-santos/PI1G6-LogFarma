import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
    deliveries,
    dispensations,
    medicationRequests,
    notifications,
    stockBatches,
    stockReservations,
} from "../src/db/schema.js";
import {
    buildTestApp,
    createBatch,
    createCourier,
    createMedication,
    createPatient,
    createPharmacy,
    createRequestRow,
    createStaff,
    loginAs,
    pharmacyAction,
    resetDb,
    testDb,
} from "./helpers.js";

async function scheduled() {
    const app = buildTestApp();
    const centro = await createPharmacy();
    const med = await createMedication({ prescriptionType: "none" });
    const batch = await createBatch({
        pharmacyId: centro.id,
        medicationId: med.id,
        batchNumber: "L1",
        expiryDate: "2027-12-31",
        quantity: 50,
    });
    const maria = await createPatient(centro.id, { email: "maria@example.com" });
    const staff = await createStaff(centro.id);
    const c1 = await createCourier("entregador1@example.com");
    const c2 = await createCourier("entregador2@example.com");
    const request = await createRequestRow({
        patientId: maria.id,
        medicationId: med.id,
        pharmacyId: centro.id,
        quantity: 30,
        fulfillment: "delivery",
    });
    const sc = await loginAs(app, staff.email);
    await pharmacyAction(app, sc, request.id, { action: "prepare" });
    await pharmacyAction(app, sc, request.id, {
        action: "schedule_delivery",
        scheduledWindow: "04/11 manhã",
    });
    const [delivery] = await testDb.select().from(deliveries);
    return { app, centro, med, batch, maria, staff, c1, c2, request, sc, delivery: delivery! };
}

function courierAction(
    app: ReturnType<typeof buildTestApp>,
    cookie: string,
    id: string,
    payload: Record<string, unknown>,
) {
    return app.inject({
        method: "POST",
        url: `/api/courier/deliveries/${id}/actions`,
        headers: { cookie },
        payload,
    });
}

describe("entrega pelo programa municipal", () => {
    beforeEach(() => resetDb());

    it("fluxo accept → pick_up → deliver baixa o estoque, cria Dispensation delivery e deixa o pedido delivered", async () => {
        const { app, c1, delivery, batch, request, staff, maria } = await scheduled();
        const cc = await loginAs(app, c1.email);
        const available = await app.inject({
            method: "GET",
            url: "/api/courier/deliveries?scope=available",
            headers: { cookie: cc },
        });
        expect(available.json().items).toHaveLength(1);
        expect(available.json().items[0].recipient).toMatchObject({
            name: "Maria Aparecida da Silva",
        });

        expect((await courierAction(app, cc, delivery.id, { action: "accept" })).statusCode).toBe(
            200,
        );
        expect((await courierAction(app, cc, delivery.id, { action: "pick_up" })).statusCode).toBe(
            200,
        );
        const [mid] = await testDb
            .select()
            .from(medicationRequests)
            .where(eq(medicationRequests.id, request.id));
        expect(mid!.status).toBe("out_for_delivery");
        const done = await courierAction(app, cc, delivery.id, {
            action: "deliver",
            receivedBy: "Maria (própria)",
        });
        expect(done.statusCode).toBe(200);

        const [req] = await testDb
            .select()
            .from(medicationRequests)
            .where(eq(medicationRequests.id, request.id));
        expect(req!.status).toBe("delivered");
        const [b] = await testDb.select().from(stockBatches).where(eq(stockBatches.id, batch.id));
        expect(b!.quantity).toBe(20);
        expect(await testDb.select().from(dispensations)).toMatchObject([
            { pickedUpBy: "delivery", quantity: 30, staffUserId: staff.id, batchId: batch.id },
        ]);
        const avisos = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, maria.id));
        expect(avisos.some((n) => n.title.includes("Saiu para entrega"))).toBe(true);
        expect(avisos.some((n) => n.title.includes("Entregue"))).toBe(true);
    });

    it("segundo entregador não aceita entrega já aceita (409) nem age nela (403)", async () => {
        const { app, c1, c2, delivery } = await scheduled();
        const a = await loginAs(app, c1.email);
        const b = await loginAs(app, c2.email);
        await courierAction(app, a, delivery.id, { action: "accept" });
        expect((await courierAction(app, b, delivery.id, { action: "accept" })).statusCode).toBe(
            409,
        );
        expect((await courierAction(app, b, delivery.id, { action: "pick_up" })).statusCode).toBe(
            403,
        );
    });

    it("fail devolve o pedido para arrived mantendo a reserva e a farmácia consegue reagendar", async () => {
        const { app, c1, delivery, request, sc } = await scheduled();
        const cc = await loginAs(app, c1.email);
        await courierAction(app, cc, delivery.id, { action: "accept" });
        await courierAction(app, cc, delivery.id, { action: "pick_up" });
        const failed = await courierAction(app, cc, delivery.id, {
            action: "fail",
            reason: "Ninguém em casa",
        });
        expect(failed.statusCode).toBe(200);
        const [req] = await testDb
            .select()
            .from(medicationRequests)
            .where(eq(medicationRequests.id, request.id));
        expect(req!.status).toBe("arrived");
        expect(await testDb.select().from(stockReservations)).toHaveLength(1);
        const again = await pharmacyAction(app, sc, request.id, {
            action: "schedule_delivery",
            scheduledWindow: "05/11 tarde",
        });
        expect(again.statusCode).toBe(200);
        expect(again.json().request.delivery).toMatchObject({
            status: "scheduled",
            scheduledWindow: "05/11 tarde",
        });
        expect(await testDb.select().from(stockReservations)).toHaveLength(1);
    });

    it("farmácia lista as entregas da unidade", async () => {
        const { app, sc } = await scheduled();
        const res = await app.inject({
            method: "GET",
            url: "/api/pharmacy/deliveries",
            headers: { cookie: sc },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().items).toHaveLength(1);
    });
});
