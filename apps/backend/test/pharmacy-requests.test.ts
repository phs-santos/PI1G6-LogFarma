import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
    deliveries,
    dispensations,
    medicationRequests,
    notifications,
    prescriptions,
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

async function counter(medOverrides: Record<string, unknown> = {}) {
    const centro = await createPharmacy();
    const med = await createMedication(medOverrides);
    const maria = await createPatient(centro.id, { email: "maria@example.com" });
    const farmaceutica = await createStaff(centro.id, "pharmacist");
    const auxiliar = await createStaff(centro.id, "pharmacy_assistant");
    const early = await createBatch({
        pharmacyId: centro.id,
        medicationId: med.id,
        batchNumber: "CEDO",
        expiryDate: "2027-01-31",
        quantity: 20,
    });
    await createBatch({
        pharmacyId: centro.id,
        medicationId: med.id,
        batchNumber: "TARDE",
        expiryDate: "2027-12-31",
        quantity: 50,
    });
    const request = await createRequestRow({
        patientId: maria.id,
        medicationId: med.id,
        pharmacyId: centro.id,
        quantity: 10,
    });
    return { centro, med, maria, farmaceutica, auxiliar, early, request };
}

async function checkedPrescription(
    patientId: string,
    medicationId: string,
    staffId: string,
    type: "simple" | "antimicrobial" | "special_control" = "simple",
) {
    const [p] = await testDb
        .insert(prescriptions)
        .values({
            patientId,
            medicationId,
            type,
            issuedAt: "2026-11-01",
            validUntil: "2099-01-01",
            prescriberName: "Dra. Helena",
            prescriberCouncil: "CRM",
            prescriberNumber: "1",
            prescriberState: "SP",
            checkedByStaffId: staffId,
            checkedAt: new Date(),
        })
        .returning();
    return p!;
}

describe("balcão da farmácia", () => {
    beforeEach(() => resetDb());

    it("lista os pedidos da unidade com os dados que o profissional precisa", async () => {
        const app = buildTestApp();
        const { farmaceutica, request } = await counter();
        const cookie = await loginAs(app, farmaceutica.email);
        const res = await app.inject({
            method: "GET",
            url: "/api/pharmacy/requests",
            headers: { cookie },
        });
        expect(res.statusCode).toBe(200);
        const item = res.json().items[0];
        expect(item.request.id).toBe(request.id);
        expect(item.patient).toMatchObject({
            name: "Maria Aparecida da Silva",
            age: expect.any(Number),
            address: null,
        });
    });

    it("prepare reserva o lote que vence primeiro e avisa o paciente", async () => {
        const app = buildTestApp();
        const { farmaceutica, request, early, maria } = await counter();
        const cookie = await loginAs(app, farmaceutica.email);
        const res = await pharmacyAction(app, cookie, request.id, { action: "prepare" });
        expect(res.statusCode).toBe(200);
        expect(res.json().request.status).toBe("ready_for_pickup");
        const reservations = await testDb.select().from(stockReservations);
        expect(reservations).toMatchObject([{ batchId: early.id, quantity: 10 }]);
        const avisos = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, maria.id));
        expect(avisos.some((n) => n.body.includes("separado"))).toBe(true);
    });

    it("dispense sem receita conferida responde 409; com receita conferida baixa o estoque e registra o lote", async () => {
        const app = buildTestApp();
        const { farmaceutica, request, early, maria, med } = await counter();
        const cookie = await loginAs(app, farmaceutica.email);
        await pharmacyAction(app, cookie, request.id, { action: "prepare" });
        const semReceita = await pharmacyAction(app, cookie, request.id, {
            action: "dispense",
            pickedUpBy: "patient",
        });
        expect(semReceita.statusCode).toBe(409);
        expect(semReceita.json().message).toContain("Receita");

        const p = await checkedPrescription(maria.id, med.id, farmaceutica.id);
        await testDb.update(medicationRequests).set({ prescriptionId: p.id });
        const ok = await pharmacyAction(app, cookie, request.id, {
            action: "dispense",
            pickedUpBy: "patient",
        });
        expect(ok.statusCode).toBe(200);
        expect(ok.json().request.status).toBe("picked_up");
        const [batch] = await testDb
            .select()
            .from(stockBatches)
            .where(eq(stockBatches.id, early.id));
        expect(batch!.quantity).toBe(10);
        const ds = await testDb.select().from(dispensations);
        expect(ds).toMatchObject([
            {
                batchId: early.id,
                quantity: 10,
                staffUserId: farmaceutica.id,
                pickedUpBy: "patient",
            },
        ]);
    });

    it("dispense duplicado responde 409 e baixa o estoque uma vez só", async () => {
        const app = buildTestApp();
        const { farmaceutica, request, early } = await counter({ prescriptionType: "none" });
        const cookie = await loginAs(app, farmaceutica.email);
        await pharmacyAction(app, cookie, request.id, { action: "prepare" });
        const [a, b] = await Promise.all([
            pharmacyAction(app, cookie, request.id, { action: "dispense", pickedUpBy: "patient" }),
            pharmacyAction(app, cookie, request.id, { action: "dispense", pickedUpBy: "patient" }),
        ]);
        expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409]);
        const [batch] = await testDb
            .select()
            .from(stockBatches)
            .where(eq(stockBatches.id, early.id));
        expect(batch!.quantity).toBe(10);
        expect(await testDb.select().from(dispensations)).toHaveLength(1);
    });

    it("auxiliar não dispensa clonazepam (403)", async () => {
        const app = buildTestApp();
        const { auxiliar, farmaceutica, request, maria, med } = await counter({
            activeIngredient: "Clonazepam",
            concentration: "2 mg",
            prescriptionType: "special_control",
            inFarmaciaPopular: false,
        });
        const p = await checkedPrescription(maria.id, med.id, farmaceutica.id, "special_control");
        await testDb.update(medicationRequests).set({ prescriptionId: p.id });
        const ac = await loginAs(app, auxiliar.email);
        await pharmacyAction(app, ac, request.id, { action: "prepare" });
        const res = await pharmacyAction(app, ac, request.id, {
            action: "dispense",
            pickedUpBy: "patient",
        });
        expect(res.statusCode).toBe(403);
    });

    it("profissional de outra unidade recebe 403", async () => {
        const app = buildTestApp();
        const { request } = await counter();
        const outra = await createPharmacy({ name: "UBS Vila Negri" });
        const intruso = await createStaff(outra.id, "pharmacist", "intruso@example.com");
        const cookie = await loginAs(app, intruso.email);
        const res = await pharmacyAction(app, cookie, request.id, { action: "prepare" });
        expect(res.statusCode).toBe(403);
    });

    it("schedule_delivery cria Delivery scheduled com refrigeração para insulina e avisa os entregadores", async () => {
        const app = buildTestApp();
        const { farmaceutica, request, maria, med } = await counter({
            activeIngredient: "Insulina humana NPH",
            concentration: "100 UI/mL",
            pharmaceuticalForm: "injectable",
            route: "subcutaneous",
            storage: "refrigerated",
        });
        const courier = await createCourier();
        const p = await checkedPrescription(maria.id, med.id, farmaceutica.id);
        await testDb.update(medicationRequests).set({ prescriptionId: p.id });
        const cookie = await loginAs(app, farmaceutica.email);
        await pharmacyAction(app, cookie, request.id, { action: "prepare" });
        const res = await pharmacyAction(app, cookie, request.id, {
            action: "schedule_delivery",
            scheduledWindow: "04/11 manhã",
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().request).toMatchObject({
            status: "delivery_scheduled",
            fulfillment: "delivery",
            delivery: { status: "scheduled", requiresRefrigeration: true },
        });
        const [d] = await testDb.select().from(deliveries);
        expect(d).toMatchObject({
            courierId: null,
            scheduledByStaffId: farmaceutica.id,
            addressSnapshot: { city: "Taquaritinga" },
        });
        const avisoEntregador = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, courier.id));
        expect(avisoEntregador).toHaveLength(1);
        const avisoMaria = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, maria.id));
        expect(avisoMaria.some((n) => n.body.includes("geladeira"))).toBe(true);
        expect(await testDb.select().from(stockReservations)).toHaveLength(1);
    });
});
