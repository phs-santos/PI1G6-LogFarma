// Correções da revisão final do branch: cada teste reproduz um achado (falhou antes da correção).
import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
    medicationRequests,
    notifications,
    prescriptions,
    purchaseOrders,
    stockBatches,
    transfers,
    waitlistEntries,
} from "../src/db/schema.js";
import { assertSeedAllowed } from "../src/db/seed.js";
import {
    buildTestApp,
    createBatch,
    createCourier,
    createMedication,
    createPatient,
    createPharmacy,
    createRequestRow,
    createSpecializedPharmacy,
    createStaff,
    createSupplier,
    createSupplierStaff,
    loginAs,
    pharmacyAction,
    prescriptionPayload,
    resetDb,
    testDb,
} from "./helpers.js";

describe("correções da revisão final", () => {
    beforeEach(() => resetDb());

    it("recusa parcial: não dá para recusar o resto de uma transferência que já teve um lote enviado (409)", async () => {
        const app = buildTestApp();
        const centro = await createPharmacy({ name: "UBS Centro" });
        const jardim = await createPharmacy({ name: "UBS Jardim" });
        const med = await createMedication({ prescriptionType: "none" });
        await createBatch({
            pharmacyId: jardim.id,
            medicationId: med.id,
            batchNumber: "A",
            expiryDate: "2027-03-01",
            quantity: 10,
        });
        await createBatch({
            pharmacyId: jardim.id,
            medicationId: med.id,
            batchNumber: "B",
            expiryDate: "2027-09-01",
            quantity: 40,
        });
        const p = await createPatient(centro.id);
        const fc = await createStaff(centro.id, "pharmacist", "c@example.com");
        const fj = await createStaff(jardim.id, "pharmacist", "j@example.com");
        const req = await createRequestRow({
            patientId: p.id,
            medicationId: med.id,
            pharmacyId: centro.id,
            quantity: 30,
        });
        const cc = await loginAs(app, fc.email);
        const jc = await loginAs(app, fj.email);
        await pharmacyAction(app, cc, req.id, {
            action: "request_transfer",
            fromPharmacyId: jardim.id,
        });
        const ts = await testDb.select().from(transfers);
        expect(ts).toHaveLength(2);
        const [first, second] = ts;
        const ship = await app.inject({
            method: "POST",
            url: `/api/pharmacy/transfers/${first!.id}/actions`,
            headers: { cookie: jc },
            payload: { action: "ship" },
        });
        expect(ship.statusCode).toBe(200);
        const refuse = await app.inject({
            method: "POST",
            url: `/api/pharmacy/transfers/${second!.id}/actions`,
            headers: { cookie: jc },
            payload: { action: "refuse", reason: "acabou" },
        });
        expect(refuse.statusCode).toBe(409);
    });

    it("lote reservado que venceu: a saída troca por outro lote válido; sem outro lote responde 409; a perda do vencido é permitida", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const med = await createMedication({ prescriptionType: "none" });
        const l1 = await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L1",
            expiryDate: "2027-01-01",
            quantity: 10,
        });
        const l2 = await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L2",
            expiryDate: "2028-01-01",
            quantity: 10,
        });
        const p = await createPatient(ubs.id);
        const staff = await createStaff(ubs.id);
        const cookie = await loginAs(app, staff.email);
        const a = await createRequestRow({
            patientId: p.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            quantity: 5,
        });
        await pharmacyAction(app, cookie, a.id, { action: "prepare" });
        await testDb
            .update(stockBatches)
            .set({ expiryDate: "2020-01-01" })
            .where(eq(stockBatches.id, l1.id));
        const ok = await pharmacyAction(app, cookie, a.id, {
            action: "dispense",
            pickedUpBy: "patient",
        });
        expect(ok.statusCode).toBe(200);
        const [b1] = await testDb.select().from(stockBatches).where(eq(stockBatches.id, l1.id));
        const [b2] = await testDb.select().from(stockBatches).where(eq(stockBatches.id, l2.id));
        expect([b1!.quantity, b2!.quantity]).toEqual([10, 5]);

        // Sem lote válido suficiente: 409. E o vencido pode ser baixado como perda mesmo reservado.
        const b = await createRequestRow({
            patientId: p.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            quantity: 5,
        });
        await pharmacyAction(app, cookie, b.id, { action: "prepare" });
        await testDb
            .update(stockBatches)
            .set({ expiryDate: "2020-01-01" })
            .where(eq(stockBatches.id, l2.id));
        const blocked = await pharmacyAction(app, cookie, b.id, {
            action: "dispense",
            pickedUpBy: "patient",
        });
        expect(blocked.statusCode).toBe(409);
        expect(blocked.json().message).toContain("venc");
        const loss = await app.inject({
            method: "POST",
            url: `/api/pharmacy/stock/batches/${l2.id}/adjust`,
            headers: { cookie },
            payload: { delta: -5, reason: "exit_loss" },
        });
        expect(loss.statusCode).toBe(200);
    });

    it("fila: quem sobra depois de uma entrega parcial entra num novo pedido de compra, perde a previsão antiga e pode ser atendido do estoque local", async () => {
        const app = buildTestApp();
        const centro = await createPharmacy();
        const esp = await createSpecializedPharmacy();
        const med = await createMedication({
            activeIngredient: "Adalimumabe",
            concentration: "40 mg",
            component: "specialized",
            prescriptionType: "none",
            inFarmaciaPopular: false,
        });
        const supplier = await createSupplier();
        const vendedor = await createSupplierStaff(supplier.id);
        const staff = await createStaff(esp.id);
        const p1 = await createPatient(centro.id, {
            email: "p1@example.com",
            priority: { category: "oncology", consent: true },
        });
        const p2 = await createPatient(centro.id, {
            email: "p2@example.com",
            birthDate: "1990-01-01",
        });
        const r1 = await createRequestRow({
            patientId: p1.id,
            medicationId: med.id,
            pharmacyId: esp.id,
        });
        const r2 = await createRequestRow({
            patientId: p2.id,
            medicationId: med.id,
            pharmacyId: esp.id,
        });
        const sc = await loginAs(app, staff.email);
        await pharmacyAction(app, sc, r1.id, {
            action: "order_from_supplier",
            supplierId: supplier.id,
        });
        await pharmacyAction(app, sc, r2.id, { action: "order_from_supplier" });
        const [po] = await testDb.select().from(purchaseOrders);
        const vc = await loginAs(app, vendedor.email);
        const sa = (payload: Record<string, unknown>) =>
            app.inject({
                method: "POST",
                url: `/api/supplier/purchase-orders/${po!.id}/actions`,
                headers: { cookie: vc },
                payload,
            });
        await sa({ action: "confirm", expectedAt: "2099-01-10" });
        await sa({
            action: "ship",
            invoiceNumber: "NF1",
            batchNumber: "X1",
            expiryDate: "2099-06-01",
            quantity: 1,
        });
        await app.inject({
            method: "POST",
            url: `/api/pharmacy/purchase-orders/${po!.id}/actions`,
            headers: { cookie: sc },
            payload: { action: "receive" },
        });

        const [left] = await testDb
            .select()
            .from(waitlistEntries)
            .where(eq(waitlistEntries.requestId, r2.id));
        expect(left!.status).toBe("waiting");
        expect(left!.purchaseOrderId).not.toBeNull();
        expect(left!.purchaseOrderId).not.toBe(po!.id);
        const [followUp] = await testDb
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, left!.purchaseOrderId!));
        expect(followUp).toMatchObject({ status: "placed", quantity: 1, supplierId: supplier.id });
        const [req2] = await testDb
            .select()
            .from(medicationRequests)
            .where(eq(medicationRequests.id, r2.id));
        expect(req2!.expectedAt).toBeNull();
        const avisos = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, p2.id));
        expect(avisos.some((n) => n.body.includes("continua na lista"))).toBe(true);

        // Chegou estoque por outro caminho: a farmácia atende quem está na fila.
        await createBatch({
            pharmacyId: esp.id,
            medicationId: med.id,
            batchNumber: "AVULSO",
            expiryDate: "2099-01-01",
            quantity: 3,
        });
        const prep = await pharmacyAction(app, sc, r2.id, { action: "prepare" });
        expect(prep.statusCode).toBe(200);
        expect(prep.json().request.status).toBe("ready_for_pickup");
        const [served] = await testDb
            .select()
            .from(waitlistEntries)
            .where(eq(waitlistEntries.requestId, r2.id));
        expect(served!.status).toBe("served");
    });

    it("receita de antimicrobiano não pode ser reaproveitada em outro pedido (409)", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const amox = await createMedication({
            activeIngredient: "Amoxicilina",
            concentration: "500 mg",
            prescriptionType: "antimicrobial",
            inFarmaciaPopular: false,
        });
        await createPatient(ubs.id, { email: "maria@example.com" });
        const cookie = await loginAs(app, "maria@example.com");
        const today = new Date().toISOString().slice(0, 10);
        const first = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: {
                medicationId: amox.id,
                quantity: 21,
                fulfillment: "pickup",
                prescription: { ...prescriptionPayload, issuedAt: today, continuousUse: false },
            },
        });
        const prescriptionId = first.json().request.prescription.id as string;
        await testDb
            .update(prescriptions)
            .set({ checkedAt: new Date() })
            .where(eq(prescriptions.id, prescriptionId));
        const reuse = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: { medicationId: amox.id, quantity: 21, fulfillment: "pickup", prescriptionId },
        });
        expect(reuse.statusCode).toBe(409);
    });

    it("entregador só vê dados do paciente depois de aceitar a entrega", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const med = await createMedication({ prescriptionType: "none" });
        await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L1",
            expiryDate: "2099-01-01",
            quantity: 10,
        });
        const p = await createPatient(ubs.id);
        const staff = await createStaff(ubs.id);
        const courier = await createCourier();
        const req = await createRequestRow({
            patientId: p.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            quantity: 2,
            fulfillment: "delivery",
        });
        const sc = await loginAs(app, staff.email);
        await pharmacyAction(app, sc, req.id, { action: "prepare" });
        await pharmacyAction(app, sc, req.id, {
            action: "schedule_delivery",
            scheduledWindow: "amanhã",
        });
        const cc = await loginAs(app, courier.email);
        const available = await app.inject({
            method: "GET",
            url: "/api/courier/deliveries?scope=available",
            headers: { cookie: cc },
        });
        const item = available.json().items[0];
        expect(item.recipient).toBeNull();
        expect(item.medication).toBeNull();
        expect(item.area).toBe("Centro, Taquaritinga/SP");
        expect(JSON.stringify(available.json())).not.toContain("Maria");
        await app.inject({
            method: "POST",
            url: `/api/courier/deliveries/${item.id}/actions`,
            headers: { cookie: cc },
            payload: { action: "accept" },
        });
        const mine = await app.inject({
            method: "GET",
            url: "/api/courier/deliveries?scope=mine",
            headers: { cookie: cc },
        });
        expect(mine.json().items[0].recipient.name).toBe("Maria Aparecida da Silva");
    });

    it("filtro por situação na lista da farmácia não some com pedidos antigos", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const med = await createMedication();
        const p = await createPatient(ubs.id);
        const staff = await createStaff(ubs.id);
        const old = await createRequestRow({
            patientId: p.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
        });
        await testDb
            .update(medicationRequests)
            .set({ createdAt: new Date("2026-01-01") })
            .where(eq(medicationRequests.id, old.id));
        await testDb.insert(medicationRequests).values(
            Array.from({ length: 205 }, () => ({
                patientId: p.id,
                medicationId: med.id,
                pharmacyId: ubs.id,
                quantity: 1,
                fulfillment: "pickup" as const,
                status: "picked_up" as const,
            })),
        );
        const cookie = await loginAs(app, staff.email);
        const res = await app.inject({
            method: "GET",
            url: "/api/pharmacy/requests?status=requested",
            headers: { cookie },
        });
        expect(res.json().items.map((i: { request: { id: string } }) => i.request.id)).toEqual([
            old.id,
        ]);
    });

    it("busca de disponibilidade do paciente não espera travas de estoque do balcão", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const med = await createMedication();
        await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L1",
            expiryDate: "2099-01-01",
            quantity: 10,
        });
        await createPatient(ubs.id, { email: "maria@example.com" });
        const cookie = await loginAs(app, "maria@example.com");
        let release!: () => void;
        const held = new Promise<void>((r) => (release = r));
        const locker = testDb.transaction(async (tx) => {
            await tx
                .select()
                .from(stockBatches)
                .where(and(eq(stockBatches.pharmacyId, ubs.id)))
                .for("update");
            await held;
        });
        await new Promise((r) => setTimeout(r, 100));
        const search = app.inject({
            method: "GET",
            url: `/api/medications/${med.id}/availability`,
            headers: { cookie },
        });
        const outcome = await Promise.race([
            search.then(() => "respondeu"),
            new Promise((r) => setTimeout(() => r("travou"), 1500)),
        ]);
        release();
        await locker;
        await search;
        expect(outcome).toBe("respondeu");
    });

    it("seed em produção exige DEMO_PASSWORD própria", () => {
        expect(() =>
            assertSeedAllowed({
                nodeEnv: "production",
                allowDemoSeed: true,
                demoPassword: "demo1234",
            }),
        ).toThrow(/DEMO_PASSWORD/);
        expect(() =>
            assertSeedAllowed({
                nodeEnv: "production",
                allowDemoSeed: false,
                demoPassword: "uma-senha-boa",
            }),
        ).toThrow(/ALLOW_DEMO_SEED/);
        expect(() =>
            assertSeedAllowed({
                nodeEnv: "production",
                allowDemoSeed: true,
                demoPassword: "uma-senha-boa",
            }),
        ).not.toThrow();
        expect(() =>
            assertSeedAllowed({
                nodeEnv: "development",
                allowDemoSeed: false,
                demoPassword: "demo1234",
            }),
        ).not.toThrow();
    });
});
