// Leituras novas pedidas pelas telas (docs/2026-11-04-frontend-design.md, "Ajustes no backend").
import { beforeEach, describe, expect, it } from "vitest";
import { prescriptions, searchEvents, waitlistEntries } from "../src/db/schema.js";
import { addDays, isoDay } from "../src/domain/dates.js";
import {
    buildTestApp,
    createBatch,
    createManager,
    createMedication,
    createPatient,
    createPharmacy,
    createRequestRow,
    createStaff,
    createSupplier,
    loginAs,
    resetDb,
    testDb,
} from "./helpers.js";

describe("leituras para as telas", () => {
    beforeEach(() => resetDb());

    it("GET /api/auth/me de farmacêutica traz unidade e ocupação; de paciente traz o nome social", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy({ name: "UBS Centro" });
        const staff = await createStaff(ubs.id, "pharmacist");
        await createPatient(ubs.id, { email: "maria@example.com", socialName: "Dona Maria" });
        const sc = await loginAs(app, staff.email);
        const me = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            headers: { cookie: sc },
        });
        expect(me.json()).toMatchObject({
            user: { role: "pharmacy_staff" },
            profile: {
                kind: "pharmacy_staff",
                occupation: "pharmacist",
                pharmacy: { id: ubs.id, name: "UBS Centro" },
            },
        });
        const login = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: "maria@example.com", password: "senha-forte-1" },
        });
        expect(login.json().profile).toMatchObject({
            kind: "patient",
            displayName: "Dona Maria",
            referencePharmacy: { id: ubs.id },
        });
    });

    it("GET /api/suppliers lista para a farmácia e recusa paciente (403)", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        await createSupplier("Zeta Distribuidora");
        await createSupplier("Alfa Distribuidora");
        const staff = await createStaff(ubs.id);
        await createPatient(ubs.id, { email: "maria@example.com" });
        const ok = await app.inject({
            method: "GET",
            url: "/api/suppliers",
            headers: { cookie: await loginAs(app, staff.email) },
        });
        expect(ok.json().items.map((s: { name: string }) => s.name)).toEqual([
            "Alfa Distribuidora",
            "Zeta Distribuidora",
        ]);
        const no = await app.inject({
            method: "GET",
            url: "/api/suppliers",
            headers: { cookie: await loginAs(app, "maria@example.com") },
        });
        expect(no.statusCode).toBe(403);
    });

    it("GET /api/manager/summary traz buscas sem estoque, lotes vencendo e fila", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const med = await createMedication();
        const today = isoDay();
        await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "VENCE",
            expiryDate: addDays(today, 20),
            quantity: 5,
        });
        await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "LONGE",
            expiryDate: addDays(today, 300),
            quantity: 5,
        });
        await testDb.insert(searchEvents).values([
            { medicationId: med.id, pharmacyId: ubs.id, foundInNetwork: false },
            { medicationId: med.id, pharmacyId: ubs.id, foundInNetwork: false },
            { medicationId: med.id, pharmacyId: ubs.id, foundInNetwork: true },
        ]);
        const p = await createPatient(ubs.id);
        const r = await createRequestRow({
            patientId: p.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            status: "waitlisted",
        });
        await testDb.insert(waitlistEntries).values({
            requestId: r.id,
            patientId: p.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            priority: 0,
        });
        const gestor = await createManager();
        const res = await app.inject({
            method: "GET",
            url: "/api/manager/summary",
            headers: { cookie: await loginAs(app, gestor.email) },
        });
        expect(res.json()).toEqual({
            unmetSearches7d: 2,
            expiringBatches60d: 1,
            waitingPatients: 1,
        });
    });

    it("network-availability não lista a própria unidade, unidade zerada nem PFPB", async () => {
        const app = buildTestApp();
        const centro = await createPharmacy({ name: "UBS Centro" });
        const jardim = await createPharmacy({ name: "UBS Jardim" });
        const vila = await createPharmacy({ name: "UBS Vila" });
        const zerada = await createPharmacy({ name: "UBS Zerada" });
        await createPharmacy({ name: "Drogaria", kind: "pfpb", network: "pfpb" });
        const med = await createMedication();
        await createBatch({
            pharmacyId: centro.id,
            medicationId: med.id,
            batchNumber: "C",
            expiryDate: "2099-01-01",
            quantity: 50,
        });
        await createBatch({
            pharmacyId: jardim.id,
            medicationId: med.id,
            batchNumber: "J",
            expiryDate: "2099-01-01",
            quantity: 120,
        });
        await createBatch({
            pharmacyId: vila.id,
            medicationId: med.id,
            batchNumber: "V",
            expiryDate: "2099-01-01",
            quantity: 25,
        });
        await createBatch({
            pharmacyId: zerada.id,
            medicationId: med.id,
            batchNumber: "Z",
            expiryDate: "2020-01-01",
            quantity: 40,
        });
        const staff = await createStaff(centro.id);
        const res = await app.inject({
            method: "GET",
            url: `/api/pharmacy/network-availability?medicationId=${med.id}`,
            headers: { cookie: await loginAs(app, staff.email) },
        });
        expect(res.json().items).toEqual([
            { pharmacyId: jardim.id, pharmacyName: "UBS Jardim", available: 120 },
            { pharmacyId: vila.id, pharmacyName: "UBS Vila", available: 25 },
        ]);
    });

    it("me/prescriptions diz se cada receita ainda pode ser usada", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const amox = await createMedication({
            activeIngredient: "Amoxicilina",
            prescriptionType: "antimicrobial",
        });
        const maria = await createPatient(ubs.id, { email: "maria@example.com" });
        const base = {
            patientId: maria.id,
            medicationId: amox.id,
            prescriberName: "Dra. H",
            prescriberCouncil: "CRM",
            prescriberNumber: "1",
            prescriberState: "SP",
        };
        const today = isoDay();
        const [usada] = await testDb
            .insert(prescriptions)
            .values({
                ...base,
                type: "antimicrobial",
                issuedAt: today,
                validUntil: addDays(today, 10),
            })
            .returning();
        await testDb.insert(prescriptions).values({
            ...base,
            type: "antimicrobial",
            issuedAt: addDays(today, -40),
            validUntil: addDays(today, -30),
        });
        const [livre] = await testDb
            .insert(prescriptions)
            .values({
                ...base,
                type: "antimicrobial",
                issuedAt: today,
                validUntil: addDays(today, 10),
            })
            .returning();
        const [continua] = await testDb
            .insert(prescriptions)
            .values({
                ...base,
                type: "simple",
                continuousUse: true,
                issuedAt: today,
                validUntil: addDays(today, 180),
            })
            .returning();
        await createRequestRow({ patientId: maria.id, medicationId: amox.id, pharmacyId: ubs.id });
        const { medicationRequests } = await import("../src/db/schema.js");
        await testDb.insert(medicationRequests).values([
            {
                patientId: maria.id,
                medicationId: amox.id,
                pharmacyId: ubs.id,
                quantity: 1,
                fulfillment: "pickup",
                prescriptionId: usada!.id,
            },
            {
                patientId: maria.id,
                medicationId: amox.id,
                pharmacyId: ubs.id,
                quantity: 1,
                fulfillment: "pickup",
                prescriptionId: continua!.id,
            },
        ]);
        const res = await app.inject({
            method: "GET",
            url: `/api/me/prescriptions?medicationId=${amox.id}`,
            headers: { cookie: await loginAs(app, "maria@example.com") },
        });
        const usable = Object.fromEntries(
            res.json().items.map((p: { id: string; usable: boolean }) => [p.id, p.usable]),
        );
        expect(usable[usada!.id]).toBe(false);
        expect(usable[livre!.id]).toBe(true);
        expect(usable[continua!.id]).toBe(true);
        expect(res.json().items).toHaveLength(4);
        expect(Object.values(usable).filter((v) => v === false)).toHaveLength(2);
    });
});
