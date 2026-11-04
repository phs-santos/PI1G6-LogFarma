import { beforeEach, describe, expect, it } from "vitest";
import { searchEvents, stockBatches } from "../src/db/schema.js";
import { addDays, isoDay } from "../src/domain/dates.js";
import {
    buildTestApp,
    createBatch,
    createManager,
    createMedication,
    createPatient,
    createPharmacy,
    createStaff,
    loginAs,
    resetDb,
    testDb,
} from "./helpers.js";

describe("gestor e estoque da unidade", () => {
    beforeEach(() => resetDb());

    it("gestor cria farmacêutico; sem CRF responde 400", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const gestor = await createManager();
        const cookie = await loginAs(app, gestor.email);
        const base = {
            role: "pharmacy_staff",
            email: "nova@example.com",
            password: "senha-forte-1",
            fullName: "Nova Farmacêutica",
            pharmacyId: ubs.id,
            occupation: "pharmacist",
        };
        const semCrf = await app.inject({
            method: "POST",
            url: "/api/manager/users",
            headers: { cookie },
            payload: base,
        });
        expect(semCrf.statusCode).toBe(400);
        const ok = await app.inject({
            method: "POST",
            url: "/api/manager/users",
            headers: { cookie },
            payload: { ...base, crfNumber: "55555", crfState: "SP" },
        });
        expect(ok.statusCode).toBe(201);
        await loginAs(app, "nova@example.com");
    });

    it("paciente não acessa /api/manager/* (403)", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        await createPatient(ubs.id, { email: "maria@example.com" });
        const cookie = await loginAs(app, "maria@example.com");
        const res = await app.inject({
            method: "GET",
            url: "/api/manager/unmet-demand",
            headers: { cookie },
        });
        expect(res.statusCode).toBe(403);
    });

    it("demanda não atendida agrupa as buscas sem estoque por medicamento e unidade", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const a = await createMedication();
        const b = await createMedication({
            activeIngredient: "Adalimumabe",
            concentration: "40 mg",
        });
        await testDb.insert(searchEvents).values([
            { medicationId: b.id, pharmacyId: ubs.id, foundInNetwork: false },
            { medicationId: b.id, pharmacyId: ubs.id, foundInNetwork: false },
            { medicationId: a.id, pharmacyId: ubs.id, foundInNetwork: false },
            { medicationId: a.id, pharmacyId: ubs.id, foundInNetwork: true },
            {
                medicationId: a.id,
                pharmacyId: ubs.id,
                foundInNetwork: false,
                createdAt: new Date("2020-01-01"),
            },
        ]);
        const gestor = await createManager();
        const cookie = await loginAs(app, gestor.email);
        const res = await app.inject({
            method: "GET",
            url: "/api/manager/unmet-demand",
            headers: { cookie },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().items).toMatchObject([
            { medicationId: b.id, pharmacyId: ubs.id, searches: 2 },
            { medicationId: a.id, pharmacyId: ubs.id, searches: 1 },
        ]);
    });

    it("painel de validade lista lotes que vencem em até 60 dias, sem lotes zerados", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const med = await createMedication();
        const today = isoDay();
        await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "VENCE-LOGO",
            expiryDate: addDays(today, 20),
            quantity: 15,
        });
        await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "LONGE",
            expiryDate: addDays(today, 300),
            quantity: 15,
        });
        await testDb
            .insert(stockBatches)
            .values({
                pharmacyId: ubs.id,
                medicationId: med.id,
                batchNumber: "ZERADO",
                expiryDate: addDays(today, 10),
                quantity: 0,
            });
        const gestor = await createManager();
        const cookie = await loginAs(app, gestor.email);
        const res = await app.inject({
            method: "GET",
            url: "/api/manager/expiring-stock?days=60",
            headers: { cookie },
        });
        expect(res.json().items.map((i: { batchNumber: string }) => i.batchNumber)).toEqual([
            "VENCE-LOGO",
        ]);
    });

    it("profissional vê o estoque da unidade em lotes, dá entrada e registra perda", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const med = await createMedication();
        const staff = await createStaff(ubs.id);
        const cookie = await loginAs(app, staff.email);
        const entrada = await app.inject({
            method: "POST",
            url: "/api/pharmacy/stock/batches",
            headers: { cookie },
            payload: {
                medicationId: med.id,
                batchNumber: "NOVO",
                expiryDate: "2099-01-01",
                quantity: 40,
            },
        });
        expect(entrada.statusCode).toBe(201);
        const minimo = await app.inject({
            method: "PATCH",
            url: `/api/pharmacy/stock/${med.id}`,
            headers: { cookie },
            payload: { minQuantity: 10 },
        });
        expect(minimo.statusCode).toBe(200);
        const perda = await app.inject({
            method: "POST",
            url: `/api/pharmacy/stock/batches/${entrada.json().batchId}/adjust`,
            headers: { cookie },
            payload: { delta: -5, reason: "exit_loss" },
        });
        expect(perda.statusCode).toBe(200);
        const estoque = await app.inject({
            method: "GET",
            url: "/api/pharmacy/stock",
            headers: { cookie },
        });
        expect(estoque.json().items).toMatchObject([
            {
                medication: { id: med.id },
                available: 35,
                reserved: 0,
                minQuantity: 10,
                batches: [{ batchNumber: "NOVO", quantity: 35 }],
            },
        ]);
    });
});
