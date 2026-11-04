// Histórico de buscas da paciente: só ela vê, ela pode apagar, e a estatística do gestor
// continua anônima.
import { beforeEach, describe, expect, it } from "vitest";
import { searchEvents } from "../src/db/schema.js";
import {
    buildTestApp,
    createMedication,
    createPatient,
    createPharmacy,
    loginAs,
    resetDb,
    testDb,
} from "./helpers.js";

describe("histórico de buscas da paciente", () => {
    beforeEach(() => resetDb());

    async function setup() {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const los = await createMedication({ activeIngredient: "Losartana potássica" });
        const met = await createMedication({
            activeIngredient: "Cloridrato de metformina",
            concentration: "850 mg",
        });
        const maria = await createPatient(ubs.id);
        const jose = await createPatient(ubs.id);
        const cookieMaria = await loginAs(app, maria.email);
        const cookieJose = await loginAs(app, jose.email);
        const view = (cookie: string, id: string) =>
            app.inject({
                method: "GET",
                url: `/api/medications/${id}/availability`,
                headers: { cookie },
            });
        const recent = (cookie: string) =>
            app.inject({ method: "GET", url: "/api/me/recent-medications", headers: { cookie } });
        return { app, los, met, cookieMaria, cookieJose, view, recent };
    }

    it("o mais recente primeiro, sem repetir o mesmo remédio", async () => {
        const { los, met, cookieMaria, view, recent } = await setup();
        await view(cookieMaria, los.id);
        await view(cookieMaria, met.id);
        await view(cookieMaria, los.id);
        const res = await recent(cookieMaria);
        expect(res.statusCode).toBe(200);
        const items = res.json().items as {
            medication: { id: string; displayName: string };
            viewedAt: string;
        }[];
        expect(items.map((i) => i.medication.id)).toEqual([los.id, met.id]);
        expect(items[0]!.medication.displayName).toBe("Losartana potássica 50 mg comprimido");
    });

    it("cada paciente só vê o próprio histórico", async () => {
        const { los, cookieMaria, cookieJose, view, recent } = await setup();
        await view(cookieMaria, los.id);
        expect((await recent(cookieJose)).json().items).toEqual([]);
    });

    it("limpar o histórico apaga só o dela e a estatística anônima continua", async () => {
        const { app, los, cookieMaria, cookieJose, view, recent } = await setup();
        await view(cookieMaria, los.id);
        await view(cookieJose, los.id);
        const del = await app.inject({
            method: "DELETE",
            url: "/api/me/recent-medications",
            headers: { cookie: cookieMaria },
        });
        expect(del.statusCode).toBe(200);
        expect((await recent(cookieMaria)).json().items).toEqual([]);
        expect((await recent(cookieJose)).json().items).toHaveLength(1);
        const events = await testDb.select().from(searchEvents);
        expect(events).toHaveLength(2);
        expect(Object.keys(events[0]!)).not.toContain("patientId");
    });
});
