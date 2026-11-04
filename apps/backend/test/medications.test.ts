import { beforeEach, describe, expect, it } from "vitest";
import { searchEvents } from "../src/db/schema.js";
import {
    buildTestApp,
    createBatch,
    createMedication,
    createPatient,
    createPharmacy,
    createStaff,
    loginAs,
    resetDb,
    testDb,
} from "./helpers.js";

async function cityScenario(patientOverrides: Record<string, unknown> = {}) {
    const centro = await createPharmacy({
        name: "UBS Centro",
        latitude: -21.406,
        longitude: -48.505,
    });
    const jardim = await createPharmacy({
        name: "UBS Jardim São Sebastião",
        latitude: -21.415,
        longitude: -48.5,
    });
    const pfpb = await createPharmacy({
        name: "Drogaria Popular",
        kind: "pfpb",
        network: "pfpb",
        cnpj: "11222333000144",
        latitude: -21.404,
        longitude: -48.507,
    });
    const losartana = await createMedication();
    await createBatch({
        pharmacyId: centro.id,
        medicationId: losartana.id,
        batchNumber: "C1",
        expiryDate: "2025-01-01",
        quantity: 50,
        minQuantity: 10,
    });
    await createBatch({
        pharmacyId: jardim.id,
        medicationId: losartana.id,
        batchNumber: "J1",
        expiryDate: "2027-12-31",
        quantity: 80,
        minQuantity: 10,
    });
    const maria = await createPatient(centro.id, {
        email: "maria@example.com",
        ...patientOverrides,
    });
    return { centro, jardim, pfpb, losartana, maria };
}

describe("medicamentos e disponibilidade", () => {
    beforeEach(() => resetDb());

    it("busca ignora acento e maiúscula", async () => {
        const app = buildTestApp();
        const { losartana } = await cityScenario();
        const cookie = await loginAs(app, "maria@example.com");
        for (const q of ["LOSARTANA", "losártana", "Potássica 50"]) {
            const res = await app.inject({
                method: "GET",
                url: `/api/medications?search=${encodeURIComponent(q)}`,
                headers: { cookie },
            });
            expect(res.statusCode).toBe(200);
            expect(res.json().items.map((m: { id: string }) => m.id)).toEqual([losartana.id]);
        }
        const first = (
            await app.inject({
                method: "GET",
                url: "/api/medications?search=losartana",
                headers: { cookie },
            })
        ).json().items[0];
        expect(first.displayName).toBe("Losartana potássica 50 mg comprimido");
    });

    it("disponibilidade: referência sem estoque vem primeiro como out e a outra UBS vem available com rota", async () => {
        const app = buildTestApp();
        const { losartana, centro, jardim } = await cityScenario();
        const cookie = await loginAs(app, "maria@example.com");
        const res = await app.inject({
            method: "GET",
            url: `/api/medications/${losartana.id}/availability`,
            headers: { cookie },
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.foundInNetwork).toBe(true);
        expect(body.items[0]).toMatchObject({
            pharmacyId: centro.id,
            isReference: true,
            status: "out",
        });
        const j = body.items.find((i: { pharmacyId: string }) => i.pharmacyId === jardim.id);
        expect(j.status).toBe("available");
        expect(j.distanceKm).toBeGreaterThanOrEqual(1.0);
        expect(j.distanceKm).toBeLessThanOrEqual(1.3);
        expect(j.routeUrl).toContain("https://www.google.com/maps/dir/");
        expect(typeof j.updatedAt).toBe("string");
    });

    it("lote vencido não aparece como disponível", async () => {
        const app = buildTestApp();
        const { losartana, centro } = await cityScenario();
        const cookie = await loginAs(app, "maria@example.com");
        const res = await app.inject({
            method: "GET",
            url: `/api/medications/${losartana.id}/availability`,
            headers: { cookie },
        });
        const c = res.json().items.find((i: { pharmacyId: string }) => i.pharmacyId === centro.id);
        expect(c.status).toBe("out");
    });

    it("paciente sem coordenadas recebe distanceKm e routeUrl null e a lista continua completa", async () => {
        const app = buildTestApp();
        const { losartana } = await cityScenario({ latitude: undefined, longitude: undefined });
        const cookie = await loginAs(app, "maria@example.com");
        const res = await app.inject({
            method: "GET",
            url: `/api/medications/${losartana.id}/availability`,
            headers: { cookie },
        });
        const items = res.json().items as { distanceKm: number | null; routeUrl: string | null }[];
        expect(items).toHaveLength(3);
        expect(items.every((i) => i.distanceKm === null && i.routeUrl === null)).toBe(true);
    });

    it("PFPB aparece só como consulta e só se o remédio está no Farmácia Popular", async () => {
        const app = buildTestApp();
        const { losartana, pfpb } = await cityScenario();
        const fora = await createMedication({
            activeIngredient: "Amoxicilina",
            concentration: "500 mg",
            inFarmaciaPopular: false,
            prescriptionType: "antimicrobial",
        });
        const cookie = await loginAs(app, "maria@example.com");
        const res = await app.inject({
            method: "GET",
            url: `/api/medications/${losartana.id}/availability`,
            headers: { cookie },
        });
        expect(
            res.json().items.find((i: { pharmacyId: string }) => i.pharmacyId === pfpb.id),
        ).toMatchObject({
            status: "unknown",
            consultationOnly: true,
        });
        const res2 = await app.inject({
            method: "GET",
            url: `/api/medications/${fora.id}/availability`,
            headers: { cookie },
        });
        expect(
            res2.json().items.some((i: { pharmacyId: string }) => i.pharmacyId === pfpb.id),
        ).toBe(false);
    });

    it("remédio especializado lista só a farmácia de especializados", async () => {
        const app = buildTestApp();
        await cityScenario();
        const esp = await createPharmacy({
            name: "Farmácia de Medicamentos Especializados",
            kind: "specialized_pharmacy",
            network: "state",
        });
        const ada = await createMedication({
            activeIngredient: "Adalimumabe",
            concentration: "40 mg",
            component: "specialized",
            pharmaceuticalForm: "injectable",
            inFarmaciaPopular: false,
        });
        const cookie = await loginAs(app, "maria@example.com");
        const res = await app.inject({
            method: "GET",
            url: `/api/medications/${ada.id}/availability`,
            headers: { cookie },
        });
        expect(res.json().items.map((i: { pharmacyId: string }) => i.pharmacyId)).toEqual([esp.id]);
        expect(res.json().foundInNetwork).toBe(false);
    });

    it("cada consulta grava um SearchEvent com foundInNetwork", async () => {
        const app = buildTestApp();
        const { losartana, centro } = await cityScenario();
        const cookie = await loginAs(app, "maria@example.com");
        await app.inject({
            method: "GET",
            url: `/api/medications/${losartana.id}/availability`,
            headers: { cookie },
        });
        const events = await testDb.select().from(searchEvents);
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            medicationId: losartana.id,
            pharmacyId: centro.id,
            foundInNetwork: true,
        });
        expect(Object.keys(events[0]!)).not.toContain("patientId");
    });

    it("farmacêutico não usa a rota de disponibilidade do paciente (403) e auxiliar pode cadastrar medicamento", async () => {
        const app = buildTestApp();
        const { losartana, centro } = await cityScenario();
        const pharmacist = await createStaff(centro.id, "pharmacist");
        const assistant = await createStaff(centro.id, "pharmacy_assistant");
        const pc = await loginAs(app, pharmacist.email);
        const res = await app.inject({
            method: "GET",
            url: `/api/medications/${losartana.id}/availability`,
            headers: { cookie: pc },
        });
        expect(res.statusCode).toBe(403);
        const ac = await loginAs(app, assistant.email);
        const created = await app.inject({
            method: "POST",
            url: "/api/medications",
            headers: { cookie: ac },
            payload: {
                activeIngredient: "Dipirona monoidratada",
                concentration: "500 mg",
                pharmaceuticalForm: "tablet",
                route: "oral",
                dispensingUnit: "comprimido",
                component: "basic",
                therapeuticClass: "analgésico",
                prescriptionType: "none",
                storage: "room_temperature",
                inRename: true,
                inFarmaciaPopular: false,
            },
        });
        expect(created.statusCode).toBe(201);
        const found = await app.inject({
            method: "GET",
            url: "/api/medications?search=dipirona",
            headers: { cookie: ac },
        });
        expect(found.json().items).toHaveLength(1);
    });

    it("lista de unidades é pública para o cadastro", async () => {
        const app = buildTestApp();
        await cityScenario();
        const res = await app.inject({ method: "GET", url: "/api/pharmacies" });
        expect(res.statusCode).toBe(200);
        expect(res.json().items).toHaveLength(3);
    });
});
