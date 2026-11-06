import { beforeEach, describe, expect, it } from "vitest";
import {
    buildTestApp,
    createCourier,
    createManager,
    createMedication,
    createPatient,
    createPharmacy,
    createStaff,
    loginAs,
    resetDb,
} from "./helpers.js";

describe("gestão: listas e contas", () => {
    beforeEach(() => resetDb());

    async function asManager() {
        const app = buildTestApp();
        const manager = await createManager();
        const cookie = await loginAs(app, manager.email);
        return { app, manager, cookie };
    }

    it("lista medicamentos em ordem, com busca e páginas", async () => {
        const { app, cookie } = await asManager();
        await createMedication({ activeIngredient: "Losartana potássica", concentration: "50 mg" });
        await createMedication({ activeIngredient: "Metformina", concentration: "850 mg" });
        const all = await app.inject({
            method: "GET",
            url: "/api/manager/medications",
            headers: { cookie },
        });
        expect(all.statusCode).toBe(200);
        expect(all.json()).toMatchObject({ total: 2, page: 1, pageSize: 25 });
        expect(
            all.json().items.map((m: { activeIngredient: string }) => m.activeIngredient),
        ).toEqual(["Losartana potássica", "Metformina"]);
        const found = await app.inject({
            method: "GET",
            url: "/api/manager/medications?search=metf",
            headers: { cookie },
        });
        expect(found.json().total).toBe(1);
    });

    it("lista só contas da equipe (sem pacientes), com nome e unidade", async () => {
        const { app, cookie } = await asManager();
        const ubs = await createPharmacy({ name: "UBS Centro" });
        await createStaff(ubs.id);
        await createCourier();
        await createPatient(ubs.id);
        const res = await app.inject({
            method: "GET",
            url: "/api/manager/users",
            headers: { cookie },
        });
        expect(res.statusCode).toBe(200);
        const items = res.json().items as { role: string; place: string | null; name: string }[];
        expect(items.map((i) => i.role).sort()).toEqual(["courier", "manager", "pharmacy_staff"]);
        expect(items.find((i) => i.role === "pharmacy_staff")).toMatchObject({
            place: "UBS Centro",
            name: "Farmacêutica Ana",
        });
        const only = await app.inject({
            method: "GET",
            url: "/api/manager/users?role=courier",
            headers: { cookie },
        });
        expect(only.json().items).toHaveLength(1);
    });

    it("desativar corta o acesso na hora e reativar devolve", async () => {
        const { app, cookie } = await asManager();
        const ubs = await createPharmacy();
        const staff = await createStaff(ubs.id);
        const staffCookie = await loginAs(app, staff.email);
        const off = await app.inject({
            method: "PATCH",
            url: `/api/manager/users/${staff.id}`,
            headers: { cookie },
            payload: { active: false },
        });
        expect(off.statusCode).toBe(200);
        const me = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            headers: { cookie: staffCookie },
        });
        expect(me.statusCode).toBe(401);
        await app.inject({
            method: "PATCH",
            url: `/api/manager/users/${staff.id}`,
            headers: { cookie },
            payload: { active: true },
        });
        expect(
            (
                await app.inject({
                    method: "GET",
                    url: "/api/auth/me",
                    headers: { cookie: staffCookie },
                })
            ).statusCode,
        ).toBe(200);
    });

    it("o gestor não desativa a si mesmo nem mexe em paciente", async () => {
        const { app, manager, cookie } = await asManager();
        const self = await app.inject({
            method: "PATCH",
            url: `/api/manager/users/${manager.id}`,
            headers: { cookie },
            payload: { active: false },
        });
        expect(self.statusCode).toBe(403);
        const ubs = await createPharmacy();
        const patient = await createPatient(ubs.id);
        const res = await app.inject({
            method: "PATCH",
            url: `/api/manager/users/${patient.id}`,
            headers: { cookie },
            payload: { active: false },
        });
        expect(res.statusCode).toBe(404);
    });

    it("quem não é gestor não vê as listas", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const staff = await createStaff(ubs.id);
        const cookie = await loginAs(app, staff.email);
        const res = await app.inject({
            method: "GET",
            url: "/api/manager/users",
            headers: { cookie },
        });
        expect(res.statusCode).toBe(403);
    });

    it("filtra medicamentos pelo componente", async () => {
        const { app, cookie } = await asManager();
        await createMedication({ activeIngredient: "Losartana potássica", component: "basic" });
        await createMedication({ activeIngredient: "Adalimumabe", component: "specialized" });
        const res = await app.inject({
            method: "GET",
            url: "/api/manager/medications?component=specialized",
            headers: { cookie },
        });
        expect(
            res.json().items.map((m: { activeIngredient: string }) => m.activeIngredient),
        ).toEqual(["Adalimumabe"]);
    });

    it("cria unidade nova e ela aparece na lista pública", async () => {
        const { app, cookie } = await asManager();
        const res = await app.inject({
            method: "POST",
            url: "/api/manager/pharmacies",
            headers: { cookie },
            payload: {
                name: "UBS Vila Xavier",
                kind: "ubs",
                network: "municipal",
                address: "Rua das Flores, 10 — Vila Xavier, Matão/SP",
                phone: "1633820000",
                openingHours: "seg–sex 7h–17h",
                cnes: "1234567",
            },
        });
        expect(res.statusCode).toBe(201);
        const list = await app.inject({ method: "GET", url: "/api/pharmacies" });
        expect(list.json().items.map((p: { name: string }) => p.name)).toContain("UBS Vila Xavier");
    });

    it("unidade com dado inválido responde 400", async () => {
        const { app, cookie } = await asManager();
        const res = await app.inject({
            method: "POST",
            url: "/api/manager/pharmacies",
            headers: { cookie },
            payload: {
                name: "X",
                kind: "hospital",
                network: "municipal",
                address: "a",
                phone: "1",
                openingHours: "",
            },
        });
        expect(res.statusCode).toBe(400);
    });
});
