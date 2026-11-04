import { beforeEach, describe, expect, it } from "vitest";
import { notifications } from "../src/db/schema.js";
import {
    buildTestApp,
    createMedication,
    createPatient,
    createPharmacy,
    createRequestRow,
    createSpecializedPharmacy,
    createStaff,
    loginAs,
    prescriptionPayload,
    resetDb,
    testDb,
} from "./helpers.js";

async function base() {
    const centro = await createPharmacy();
    const esp = await createSpecializedPharmacy();
    const losartana = await createMedication();
    const adalimumabe = await createMedication({
        activeIngredient: "Adalimumabe",
        concentration: "40 mg",
        pharmaceuticalForm: "injectable",
        route: "subcutaneous",
        component: "specialized",
        storage: "refrigerated",
        inFarmaciaPopular: false,
    });
    const amoxicilina = await createMedication({
        activeIngredient: "Amoxicilina",
        concentration: "500 mg",
        pharmaceuticalForm: "capsule",
        prescriptionType: "antimicrobial",
        inFarmaciaPopular: false,
    });
    const maria = await createPatient(centro.id, { email: "maria@example.com" });
    const farmaceutica = await createStaff(centro.id, "pharmacist");
    const auxiliar = await createStaff(centro.id, "pharmacy_assistant");
    return { centro, esp, losartana, adalimumabe, amoxicilina, maria, farmaceutica, auxiliar };
}

describe("pedido do paciente", () => {
    beforeEach(() => resetDb());

    it("pedido de losartana vai para a UBS de referência; de adalimumabe, para a farmácia de especializados", async () => {
        const app = buildTestApp();
        const { centro, esp, losartana, adalimumabe } = await base();
        const cookie = await loginAs(app, "maria@example.com");
        const r1 = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: { medicationId: losartana.id, quantity: 30, fulfillment: "delivery" },
        });
        expect(r1.statusCode).toBe(201);
        expect(r1.json().request).toMatchObject({
            status: "requested",
            fulfillment: "delivery",
            pharmacy: { id: centro.id },
        });
        const r2 = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: { medicationId: adalimumabe.id, quantity: 1, fulfillment: "pickup" },
        });
        expect(r2.json().request.pharmacy.id).toBe(esp.id);
    });

    it("pedido avisa os profissionais da unidade responsável", async () => {
        const app = buildTestApp();
        const { losartana, farmaceutica, auxiliar } = await base();
        const cookie = await loginAs(app, "maria@example.com");
        await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: { medicationId: losartana.id, quantity: 30, fulfillment: "pickup" },
        });
        const rows = await testDb.select().from(notifications);
        expect(rows.map((n) => n.userId).sort()).toEqual([farmaceutica.id, auxiliar.id].sort());
        expect(rows[0]!.body).not.toContain("Maria");
    });

    it("paciente não vê pedido de outro paciente (404)", async () => {
        const app = buildTestApp();
        const { centro, losartana } = await base();
        const joao = await createPatient(centro.id, { email: "joao@example.com" });
        const other = await createRequestRow({
            patientId: joao.id,
            medicationId: losartana.id,
            pharmacyId: centro.id,
        });
        const cookie = await loginAs(app, "maria@example.com");
        const res = await app.inject({
            method: "GET",
            url: `/api/requests/${other.id}`,
            headers: { cookie },
        });
        expect(res.statusCode).toBe(404);
    });

    it("cancelar em requested funciona; em ready_for_pickup responde 409", async () => {
        const app = buildTestApp();
        const { centro, losartana, maria } = await base();
        const a = await createRequestRow({
            patientId: maria.id,
            medicationId: losartana.id,
            pharmacyId: centro.id,
        });
        const b = await createRequestRow({
            patientId: maria.id,
            medicationId: losartana.id,
            pharmacyId: centro.id,
            status: "ready_for_pickup",
        });
        const cookie = await loginAs(app, "maria@example.com");
        const ok = await app.inject({
            method: "PATCH",
            url: `/api/requests/${a.id}`,
            headers: { cookie },
            payload: { cancel: true },
        });
        expect(ok.statusCode).toBe(200);
        expect(ok.json().request.status).toBe("cancelled");
        const no = await app.inject({
            method: "PATCH",
            url: `/api/requests/${b.id}`,
            headers: { cookie },
            payload: { cancel: true },
        });
        expect(no.statusCode).toBe(409);
    });

    it("auxiliar não confere receita de amoxicilina (403); farmacêutico confere", async () => {
        const app = buildTestApp();
        const { amoxicilina, farmaceutica, auxiliar } = await base();
        const cookie = await loginAs(app, "maria@example.com");
        const created = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: {
                medicationId: amoxicilina.id,
                quantity: 21,
                fulfillment: "pickup",
                prescription: {
                    ...prescriptionPayload,
                    issuedAt: new Date().toISOString().slice(0, 10),
                    continuousUse: false,
                },
            },
        });
        expect(created.statusCode).toBe(201);
        const prescriptionId = created.json().request.prescription.id as string;
        expect(created.json().request.prescription).toMatchObject({
            type: "antimicrobial",
            checked: false,
        });

        const ac = await loginAs(app, auxiliar.email);
        const denied = await app.inject({
            method: "POST",
            url: `/api/pharmacy/prescriptions/${prescriptionId}/check`,
            headers: { cookie: ac },
        });
        expect(denied.statusCode).toBe(403);
        expect(denied.json().message).toContain("farmacêutico");

        const fc = await loginAs(app, farmaceutica.email);
        const ok = await app.inject({
            method: "POST",
            url: `/api/pharmacy/prescriptions/${prescriptionId}/check`,
            headers: { cookie: fc },
        });
        expect(ok.statusCode).toBe(200);
        expect(ok.json().prescription.checked).toBe(true);
    });

    it("receita simples de uso contínuo emitida em 2026-11-01 vale até 2027-04-30", async () => {
        const app = buildTestApp();
        const { losartana } = await base();
        const cookie = await loginAs(app, "maria@example.com");
        const created = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: {
                medicationId: losartana.id,
                quantity: 30,
                fulfillment: "pickup",
                prescription: prescriptionPayload,
            },
        });
        expect(created.json().request.prescription).toMatchObject({
            type: "simple",
            validUntil: "2027-04-30",
        });
    });

    it("receita vencida não pode ser conferida (409)", async () => {
        const app = buildTestApp();
        const { amoxicilina, farmaceutica } = await base();
        const cookie = await loginAs(app, "maria@example.com");
        const created = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: {
                medicationId: amoxicilina.id,
                quantity: 21,
                fulfillment: "pickup",
                prescription: {
                    ...prescriptionPayload,
                    issuedAt: "2026-01-01",
                    continuousUse: false,
                },
            },
        });
        const fc = await loginAs(app, farmaceutica.email);
        const res = await app.inject({
            method: "POST",
            url: `/api/pharmacy/prescriptions/${created.json().request.prescription.id}/check`,
            headers: { cookie: fc },
        });
        expect(res.statusCode).toBe(409);
    });

    it("pedido pode usar receita já cadastrada da paciente; receita de outra pessoa responde 404", async () => {
        const app = buildTestApp();
        const { centro, losartana } = await base();
        const cookie = await loginAs(app, "maria@example.com");
        const first = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: {
                medicationId: losartana.id,
                quantity: 30,
                fulfillment: "pickup",
                prescription: prescriptionPayload,
            },
        });
        const prescriptionId = first.json().request.prescription.id as string;
        const reuse = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: {
                medicationId: losartana.id,
                quantity: 30,
                fulfillment: "pickup",
                prescriptionId,
            },
        });
        expect(reuse.statusCode).toBe(201);
        expect(reuse.json().request.prescription.id).toBe(prescriptionId);

        await createPatient(centro.id, { email: "joao@example.com" });
        const joao = await loginAs(app, "joao@example.com");
        const steal = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie: joao },
            payload: {
                medicationId: losartana.id,
                quantity: 30,
                fulfillment: "pickup",
                prescriptionId,
            },
        });
        expect(steal.statusCode).toBe(404);
    });

    it("paciente pode informar a receita depois de criar o pedido", async () => {
        const app = buildTestApp();
        const { losartana } = await base();
        const cookie = await loginAs(app, "maria@example.com");
        const created = await app.inject({
            method: "POST",
            url: "/api/requests",
            headers: { cookie },
            payload: { medicationId: losartana.id, quantity: 30, fulfillment: "pickup" },
        });
        const id = created.json().request.id as string;
        const res = await app.inject({
            method: "POST",
            url: `/api/requests/${id}/prescription`,
            headers: { cookie },
            payload: prescriptionPayload,
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().request.prescription.type).toBe("simple");
    });
});
