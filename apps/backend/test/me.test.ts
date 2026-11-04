import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { dispensations, waitlistEntries } from "../src/db/schema.js";
import { waitlistQueue } from "../src/services/purchasing.js";
import {
    buildTestApp,
    createBatch,
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

describe("perfil do paciente", () => {
    beforeEach(() => resetDb());

    it("GET /api/me devolve o perfil com a prioridade declarada", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        await createPatient(ubs.id, {
            email: "maria@example.com",
            priority: { category: "chronic", consent: true },
        });
        const cookie = await loginAs(app, "maria@example.com");
        const res = await app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
        expect(res.statusCode).toBe(200);
        expect(res.json().profile).toMatchObject({
            fullName: "Maria Aparecida da Silva",
            referencePharmacy: { id: ubs.id },
            priority: { category: "chronic" },
        });
    });

    it("retirar consentimento faz a prioridade clínica deixar de valer e a fila é reordenada", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const med = await createMedication();
        const antes = await createPatient(ubs.id, {
            email: "antes@example.com",
            birthDate: "1990-01-01",
        });
        const cronica = await createPatient(ubs.id, {
            email: "cronica@example.com",
            birthDate: "1976-05-05",
            priority: { category: "chronic", consent: true },
        });
        const r1 = await createRequestRow({
            patientId: antes.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            status: "waitlisted",
        });
        const r2 = await createRequestRow({
            patientId: cronica.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            status: "waitlisted",
        });
        await testDb.insert(waitlistEntries).values([
            {
                requestId: r1.id,
                patientId: antes.id,
                medicationId: med.id,
                pharmacyId: ubs.id,
                priority: 0,
                createdAt: new Date("2026-11-01T10:00:00Z"),
            },
            {
                requestId: r2.id,
                patientId: cronica.id,
                medicationId: med.id,
                pharmacyId: ubs.id,
                priority: 300,
                createdAt: new Date("2026-11-02T10:00:00Z"),
            },
        ]);
        expect((await waitlistQueue(testDb, ubs.id, med.id)).map((e) => e.requestId)).toEqual([
            r2.id,
            r1.id,
        ]);

        const cookie = await loginAs(app, "cronica@example.com");
        const res = await app.inject({
            method: "PATCH",
            url: "/api/me",
            headers: { cookie },
            payload: { priority: { revoke: true } },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().profile.priority).toBeNull();
        expect((await waitlistQueue(testDb, ubs.id, med.id)).map((e) => e.requestId)).toEqual([
            r1.id,
            r2.id,
        ]);
        const [entry] = await testDb
            .select()
            .from(waitlistEntries)
            .where(eq(waitlistEntries.requestId, r2.id));
        expect(entry!.priority).toBe(0);
    });

    it("responsável cadastrado pode retirar no balcão; responsável de outro paciente responde 409", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const med = await createMedication({ prescriptionType: "none" });
        await createBatch({
            pharmacyId: ubs.id,
            medicationId: med.id,
            batchNumber: "L1",
            expiryDate: "2027-12-31",
            quantity: 20,
        });
        const maria = await createPatient(ubs.id, { email: "maria@example.com" });
        await createPatient(ubs.id, { email: "joao@example.com" });
        const staff = await createStaff(ubs.id);

        const mc = await loginAs(app, "maria@example.com");
        const filha = await app.inject({
            method: "POST",
            url: "/api/me/caregivers",
            headers: { cookie: mc },
            payload: {
                fullName: "Ana da Silva",
                document: "12345678901",
                relationship: "filha",
                phone: "16999991111",
            },
        });
        expect(filha.statusCode).toBe(201);
        const jc = await loginAs(app, "joao@example.com");
        const doJoao = await app.inject({
            method: "POST",
            url: "/api/me/caregivers",
            headers: { cookie: jc },
            payload: {
                fullName: "Pedro",
                document: "98765432100",
                relationship: "filho",
                phone: "16999992222",
            },
        });

        const sc = await loginAs(app, staff.email);
        const r1 = await createRequestRow({
            patientId: maria.id,
            medicationId: med.id,
            pharmacyId: ubs.id,
            quantity: 5,
        });
        await pharmacyAction(app, sc, r1.id, { action: "prepare" });
        const errado = await pharmacyAction(app, sc, r1.id, {
            action: "dispense",
            pickedUpBy: "caregiver",
            caregiverId: doJoao.json().caregiver.id,
        });
        expect(errado.statusCode).toBe(409);
        const certo = await pharmacyAction(app, sc, r1.id, {
            action: "dispense",
            pickedUpBy: "caregiver",
            caregiverId: filha.json().caregiver.id,
        });
        expect(certo.statusCode).toBe(200);
        const [d] = await testDb.select().from(dispensations);
        expect(d).toMatchObject({
            pickedUpBy: "caregiver",
            caregiverId: filha.json().caregiver.id,
        });

        const lista = await app.inject({
            method: "GET",
            url: "/api/me/caregivers",
            headers: { cookie: mc },
        });
        expect(lista.json().items).toHaveLength(1);
    });
});
