import { beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
    medicationRequests,
    notifications,
    purchaseOrders,
    stockReservations,
    waitlistEntries,
} from "../src/db/schema.js";
import {
    buildTestApp,
    createBatch,
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
    resetDb,
    testDb,
} from "./helpers.js";

async function scene3() {
    const centro = await createPharmacy();
    const esp = await createSpecializedPharmacy();
    const ada = await createMedication({
        activeIngredient: "Adalimumabe",
        concentration: "40 mg",
        pharmaceuticalForm: "injectable",
        route: "subcutaneous",
        component: "specialized",
        storage: "refrigerated",
        prescriptionType: "simple",
        inFarmaciaPopular: false,
    });
    const supplier = await createSupplier();
    const vendedor = await createSupplierStaff(supplier.id);
    const farmaceutico = await createStaff(esp.id, "pharmacist", "esp@example.com");
    const jovem = await createPatient(centro.id, {
        email: "jovem@example.com",
        birthDate: "1981-02-02",
    });
    const onco = await createPatient(centro.id, {
        email: "onco@example.com",
        birthDate: "1990-01-01",
        priority: { category: "oncology", consent: true },
    });
    const maria = await createPatient(centro.id, {
        email: "maria@example.com",
        birthDate: "1954-03-10",
        priority: { category: "chronic", consent: true },
    });
    const reqJovem = await createRequestRow({
        patientId: jovem.id,
        medicationId: ada.id,
        pharmacyId: esp.id,
    });
    const reqOnco = await createRequestRow({
        patientId: onco.id,
        medicationId: ada.id,
        pharmacyId: esp.id,
    });
    const reqMaria = await createRequestRow({
        patientId: maria.id,
        medicationId: ada.id,
        pharmacyId: esp.id,
    });
    return {
        centro,
        esp,
        ada,
        supplier,
        vendedor,
        farmaceutico,
        jovem,
        onco,
        maria,
        reqJovem,
        reqOnco,
        reqMaria,
    };
}

function supplierAction(
    app: ReturnType<typeof buildTestApp>,
    cookie: string,
    id: string,
    payload: Record<string, unknown>,
) {
    return app.inject({
        method: "POST",
        url: `/api/supplier/purchase-orders/${id}/actions`,
        headers: { cookie },
        payload,
    });
}

describe("compra, fornecedor e fila", () => {
    beforeEach(() => resetDb());

    it("order_from_supplier com estoque em outra unidade responde 409", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const jardim = await createPharmacy({ name: "UBS Jardim" });
        const med = await createMedication();
        await createBatch({
            pharmacyId: jardim.id,
            medicationId: med.id,
            batchNumber: "J1",
            expiryDate: "2027-12-31",
            quantity: 50,
        });
        const supplier = await createSupplier();
        const p = await createPatient(ubs.id, { email: "p@example.com" });
        const staff = await createStaff(ubs.id);
        const req = await createRequestRow({
            patientId: p.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            quantity: 10,
        });
        const cookie = await loginAs(app, staff.email);
        const res = await pharmacyAction(app, cookie, req.id, {
            action: "order_from_supplier",
            supplierId: supplier.id,
        });
        expect(res.statusCode).toBe(409);
        expect(res.json().message).toContain("transferência");
    });

    it("dois pedidos do mesmo remédio na mesma unidade reaproveitam o mesmo PurchaseOrder e somam a quantidade", async () => {
        const app = buildTestApp();
        const { farmaceutico, supplier, reqJovem, reqOnco, vendedor } = await scene3();
        const cookie = await loginAs(app, farmaceutico.email);
        const a = await pharmacyAction(app, cookie, reqJovem.id, {
            action: "order_from_supplier",
            supplierId: supplier.id,
        });
        expect(a.statusCode).toBe(200);
        expect(a.json().request).toMatchObject({ status: "waitlisted", waitlistPosition: 1 });
        const b = await pharmacyAction(app, cookie, reqOnco.id, { action: "order_from_supplier" });
        expect(b.statusCode).toBe(200);
        expect(b.json().request.waitlistPosition).toBe(1);
        const orders = await testDb.select().from(purchaseOrders);
        expect(orders).toHaveLength(1);
        expect(orders[0]).toMatchObject({ quantity: 2, origin: "manual", status: "placed" });
        const avisoFornecedor = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, vendedor.id));
        expect(avisoFornecedor.length).toBeGreaterThanOrEqual(1);
    });

    it("fornecedor só vê e responde os pedidos de compra dele", async () => {
        const app = buildTestApp();
        const { farmaceutico, supplier, reqJovem } = await scene3();
        const outro = await createSupplier("Outra Distribuidora");
        const intruso = await createSupplierStaff(outro.id, "intruso@example.com");
        const cookie = await loginAs(app, farmaceutico.email);
        await pharmacyAction(app, cookie, reqJovem.id, {
            action: "order_from_supplier",
            supplierId: supplier.id,
        });
        const [po] = await testDb.select().from(purchaseOrders);
        const ic = await loginAs(app, intruso.email);
        const list = await app.inject({
            method: "GET",
            url: "/api/supplier/purchase-orders",
            headers: { cookie: ic },
        });
        expect(list.json().items).toHaveLength(0);
        const res = await supplierAction(app, ic, po!.id, { action: "no_date" });
        expect(res.statusCode).toBe(404);
    });

    it("confirm grava a previsão e avisa os pacientes da fila", async () => {
        const app = buildTestApp();
        const { farmaceutico, supplier, reqMaria, vendedor, maria } = await scene3();
        const cookie = await loginAs(app, farmaceutico.email);
        await pharmacyAction(app, cookie, reqMaria.id, {
            action: "order_from_supplier",
            supplierId: supplier.id,
        });
        const [po] = await testDb.select().from(purchaseOrders);
        const vc = await loginAs(app, vendedor.email);
        const res = await supplierAction(app, vc, po!.id, {
            action: "confirm",
            expectedAt: "2099-11-20",
        });
        expect(res.statusCode).toBe(200);
        const [req] = await testDb
            .select()
            .from(medicationRequests)
            .where(eq(medicationRequests.id, reqMaria.id));
        expect(req!.expectedAt).toBe("2099-11-20");
        const avisos = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, maria.id));
        expect(avisos.some((n) => n.body.includes("20/11"))).toBe(true);
    });

    it("receive com 2 unidades atende o oncológico e a Maria e deixa o paciente de 45 anos sem prioridade na fila", async () => {
        const app = buildTestApp();
        const s = await scene3();
        const cookie = await loginAs(app, s.farmaceutico.email);
        // O de 45 anos entrou primeiro na fila.
        await pharmacyAction(app, cookie, s.reqJovem.id, {
            action: "order_from_supplier",
            supplierId: s.supplier.id,
        });
        await pharmacyAction(app, cookie, s.reqOnco.id, { action: "order_from_supplier" });
        await pharmacyAction(app, cookie, s.reqMaria.id, { action: "order_from_supplier" });
        const fila = await app.inject({
            method: "GET",
            url: `/api/pharmacy/waitlist?medicationId=${s.ada.id}`,
            headers: { cookie },
        });
        expect(fila.json().items.map((i: { category: string | null }) => i.category)).toEqual([
            "oncology",
            "chronic",
            null,
        ]);
        expect(JSON.stringify(fila.json())).not.toContain("CID");

        const [po] = await testDb.select().from(purchaseOrders);
        const vc = await loginAs(app, s.vendedor.email);
        await supplierAction(app, vc, po!.id, { action: "confirm", expectedAt: "2099-11-20" });
        const shipped = await supplierAction(app, vc, po!.id, {
            action: "ship",
            invoiceNumber: "NF-1001",
            batchNumber: "ADA-2026-01",
            expiryDate: "2099-06-30",
            quantity: 2,
        });
        expect(shipped.statusCode).toBe(200);
        const received = await app.inject({
            method: "POST",
            url: `/api/pharmacy/purchase-orders/${po!.id}/actions`,
            headers: { cookie },
            payload: { action: "receive" },
        });
        expect(received.statusCode).toBe(200);

        const reqs = await testDb
            .select()
            .from(medicationRequests)
            .where(inArray(medicationRequests.id, [s.reqJovem.id, s.reqOnco.id, s.reqMaria.id]));
        const status = Object.fromEntries(reqs.map((r) => [r.id, r.status]));
        expect(status[s.reqOnco.id]).toBe("arrived");
        expect(status[s.reqMaria.id]).toBe("arrived");
        expect(status[s.reqJovem.id]).toBe("waitlisted");
        expect(await testDb.select().from(stockReservations)).toHaveLength(2);
        const [restante] = await testDb
            .select()
            .from(waitlistEntries)
            .where(eq(waitlistEntries.requestId, s.reqJovem.id));
        expect(restante!.status).toBe("waiting");
        // Quem sobra entra num novo pedido de compra ao mesmo fornecedor (não fica parado).
        expect(restante!.purchaseOrderId).not.toBeNull();
        expect(restante!.purchaseOrderId).not.toBe(po!.id);
    });

    it("a próxima compra do mesmo remédio religa quem ficou na fila", async () => {
        const app = buildTestApp();
        const s = await scene3();
        const cookie = await loginAs(app, s.farmaceutico.email);
        await pharmacyAction(app, cookie, s.reqJovem.id, {
            action: "order_from_supplier",
            supplierId: s.supplier.id,
        });
        const [po] = await testDb.select().from(purchaseOrders);
        const vc = await loginAs(app, s.vendedor.email);
        await supplierAction(app, vc, po!.id, {
            action: "ship",
            invoiceNumber: "NF-1",
            batchNumber: "L0",
            expiryDate: "2099-01-01",
            quantity: 0 + 1,
        });
        // Antes de receber, outro paciente entra; a compra já foi enviada e não muda.
        await pharmacyAction(app, cookie, s.reqMaria.id, {
            action: "order_from_supplier",
            supplierId: s.supplier.id,
        });
        const orders = await testDb.select().from(purchaseOrders);
        expect(orders).toHaveLength(2);
        const [entry] = await testDb
            .select()
            .from(waitlistEntries)
            .where(eq(waitlistEntries.requestId, s.reqMaria.id));
        expect(entry!.purchaseOrderId).toBe(orders.find((o) => o.id !== po!.id)!.id);
    });
});
