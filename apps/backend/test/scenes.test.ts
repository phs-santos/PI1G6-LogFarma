// As três cenas da demonstração "Dona Maria" (design: docs/2026-11-03-backend-design.md), cada ator com o próprio login.
import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
    medicationRequests,
    notifications,
    prescriptions,
    purchaseOrders,
    stockBatches,
} from "../src/db/schema.js";
import { seedDemo, type DemoIds } from "../src/db/seed.js";
import { buildTestApp, testDb } from "./helpers.js";

const PASSWORD = "demo1234";
let ids: DemoIds;
let app: ReturnType<typeof buildTestApp>;

async function login(email: string): Promise<string> {
    const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email, password: PASSWORD },
    });
    expect(res.statusCode).toBe(200);
    return String(res.headers["set-cookie"]).split(";")[0]!;
}

async function act(cookie: string, url: string, payload: Record<string, unknown>) {
    const res = await app.inject({ method: "POST", url, headers: { cookie }, payload });
    expect(res.statusCode, `${url} ${res.body}`).toBe(200);
    return res.json();
}

async function mariaPrescription(medicationId: string): Promise<string> {
    const [p] = await testDb
        .select()
        .from(prescriptions)
        .where(
            and(
                eq(prescriptions.patientId, ids.users.maria),
                eq(prescriptions.medicationId, medicationId),
            ),
        );
    return p!.id;
}

describe("demonstração Dona Maria", () => {
    beforeEach(async () => {
        ids = await seedDemo(testDb, new Date(), PASSWORD);
        app = buildTestApp();
    });

    it("cena 1: antes de sair de casa, Maria vê onde tem losartana", async () => {
        const maria = await login("maria@demo.logfarma");
        const search = await app.inject({
            method: "GET",
            url: "/api/medications?search=losartana",
            headers: { cookie: maria },
        });
        expect(search.json().items[0].id).toBe(ids.medications.losartana);
        const res = await app.inject({
            method: "GET",
            url: `/api/medications/${ids.medications.losartana}/availability`,
            headers: { cookie: maria },
        });
        const items = res.json().items as {
            pharmacyId: string;
            status: string;
            distanceKm: number;
            routeUrl: string;
            consultationOnly: boolean;
        }[];
        expect(items[0]).toMatchObject({ pharmacyId: ids.pharmacies.centro, status: "out" });
        const jardim = items.find((i) => i.pharmacyId === ids.pharmacies.jardim)!;
        expect(jardim.status).toBe("available");
        expect(jardim.distanceKm).toBeGreaterThanOrEqual(1.0);
        expect(jardim.distanceKm).toBeLessThanOrEqual(1.4);
        expect(jardim.routeUrl).toContain("google.com/maps");
        expect(items.some((i) => i.consultationOnly)).toBe(true);
    });

    it("cena 2: não consigo ir até lá — transferência e entrega em casa", async () => {
        const maria = await login("maria@demo.logfarma");
        const centro = await login("farmaceutico.centro@demo.logfarma");
        const jardim = await login("farmaceutico.jardim@demo.logfarma");
        const entregador = await login("entregador1@demo.logfarma");
        const jardimStock = async () =>
            (
                await testDb
                    .select()
                    .from(stockBatches)
                    .where(
                        and(
                            eq(stockBatches.pharmacyId, ids.pharmacies.jardim),
                            eq(stockBatches.medicationId, ids.medications.losartana),
                        ),
                    )
            ).reduce((sum, b) => sum + b.quantity, 0);
        const jardimAntes = await jardimStock();

        const created = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie: maria },
            payload: {
                medicationId: ids.medications.losartana,
                quantity: 30,
                fulfillment: "delivery",
                prescriptionId: await mariaPrescription(ids.medications.losartana),
            },
        });
        expect(created.statusCode).toBe(201);
        const requestId = created.json().request.id as string;
        const prescriptionId = created.json().request.prescription.id as string;

        await act(centro, `/api/pharmacy/prescriptions/${prescriptionId}/check`, {});
        await act(centro, `/api/pharmacy/requests/${requestId}/actions`, {
            action: "request_transfer",
            fromPharmacyId: ids.pharmacies.jardim,
        });
        const outgoing = await app.inject({
            method: "GET",
            url: "/api/pharmacy/transfers?direction=outgoing",
            headers: { cookie: jardim },
        });
        const transferId = outgoing.json().items[0].id as string;
        await act(jardim, `/api/pharmacy/transfers/${transferId}/actions`, { action: "ship" });
        await act(centro, `/api/pharmacy/transfers/${transferId}/actions`, { action: "receive" });
        await act(centro, `/api/pharmacy/requests/${requestId}/actions`, {
            action: "schedule_delivery",
            scheduledWindow: "amanhã de manhã",
        });

        const disponiveis = await app.inject({
            method: "GET",
            url: "/api/courier/deliveries?scope=available",
            headers: { cookie: entregador },
        });
        const deliveryId = disponiveis.json().items[0].id as string;
        await act(entregador, `/api/courier/deliveries/${deliveryId}/actions`, {
            action: "accept",
        });
        await act(entregador, `/api/courier/deliveries/${deliveryId}/actions`, {
            action: "pick_up",
        });
        await act(entregador, `/api/courier/deliveries/${deliveryId}/actions`, {
            action: "deliver",
            receivedBy: "Maria (própria)",
        });

        const final = await app.inject({
            method: "GET",
            url: `/api/requests/${requestId}`,
            headers: { cookie: maria },
        });
        expect(final.json().request.status).toBe("delivered");
        const avisos = await testDb
            .select()
            .from(notifications)
            .where(
                and(
                    eq(notifications.userId, ids.users.maria),
                    eq(notifications.requestId, requestId),
                ),
            );
        expect(avisos.map((n) => n.title)).toEqual(
            expect.arrayContaining([
                "Buscando seu remédio",
                "Seu remédio chegou",
                "Entrega agendada",
                "Saiu para entrega",
                "Entregue",
            ]),
        );
        expect(await jardimStock()).toBe(jardimAntes - 30);
    });

    it("cena 3: ninguém tem — fila com prioridade, fornecedor e chegada", async () => {
        const maria = await login("maria@demo.logfarma");
        const esp = await login("farmaceutico.especializados@demo.logfarma");
        const fornecedor = await login("fornecedor@demo.logfarma");

        const busca = await app.inject({
            method: "GET",
            url: `/api/medications/${ids.medications.adalimumabe}/availability`,
            headers: { cookie: maria },
        });
        expect(busca.json().foundInNetwork).toBe(false);

        const created = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie: maria },
            payload: {
                medicationId: ids.medications.adalimumabe,
                quantity: 1,
                fulfillment: "pickup",
                prescriptionId: await mariaPrescription(ids.medications.adalimumabe),
            },
        });
        const requestId = created.json().request.id as string;
        expect(created.json().request.pharmacy.id).toBe(ids.pharmacies.especializados);

        const waitlisted = await act(esp, `/api/pharmacy/requests/${requestId}/actions`, {
            action: "order_from_supplier",
        });
        expect(waitlisted.request).toMatchObject({ status: "waitlisted", waitlistPosition: 2 });

        const [po] = await testDb
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.medicationId, ids.medications.adalimumabe));
        await act(fornecedor, `/api/supplier/purchase-orders/${po!.id}/actions`, {
            action: "confirm",
            expectedAt: "2099-11-20",
        });
        await act(fornecedor, `/api/supplier/purchase-orders/${po!.id}/actions`, {
            action: "ship",
            invoiceNumber: "NF-2026-0042",
            batchNumber: "ADA-26-11",
            expiryDate: "2099-06-30",
            quantity: 2,
        });
        await act(esp, `/api/pharmacy/purchase-orders/${po!.id}/actions`, { action: "receive" });

        const reqs = await testDb
            .select()
            .from(medicationRequests)
            .where(eq(medicationRequests.medicationId, ids.medications.adalimumabe));
        const by = Object.fromEntries(reqs.map((r) => [r.patientId, r.status]));
        expect(by[ids.users.oncologico]).toBe("arrived");
        expect(by[ids.users.maria]).toBe("arrived");
        expect(by[ids.users.semPrioridade]).toBe("waitlisted");
    });

    it("fechamento: gestor vê a demanda não atendida e os lotes vencendo", async () => {
        const gestor = await login("gestor@demo.logfarma");
        const demanda = await app.inject({
            method: "GET",
            url: "/api/manager/unmet-demand",
            headers: { cookie: gestor },
        });
        expect(
            demanda
                .json()
                .items.some(
                    (i: { medicationId: string }) => i.medicationId === ids.medications.adalimumabe,
                ),
        ).toBe(true);
        const validade = await app.inject({
            method: "GET",
            url: "/api/manager/expiring-stock?days=60",
            headers: { cookie: gestor },
        });
        expect(validade.json().items.length).toBeGreaterThanOrEqual(2);
    });

    it("o seed pode rodar de novo e zera o estado", async () => {
        const again = await seedDemo(testDb, new Date(), PASSWORD);
        expect(again.users.maria).not.toBe(ids.users.maria);
        const all = await testDb.select().from(medicationRequests);
        expect(all.length).toBe(2);
    });
});
