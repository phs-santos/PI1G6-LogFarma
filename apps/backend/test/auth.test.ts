import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../src/db/schema.js";
import { requireAuth, requireRole } from "../src/auth/guards.js";
import {
    buildTestApp,
    createPatient,
    createPharmacy,
    createStaff,
    loginAs,
    patientPayload,
    resetDb,
    testDb,
} from "./helpers.js";

describe("login e cadastro", () => {
    beforeEach(() => resetDb());

    it("register cria paciente e login devolve cookie httpOnly", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const reg = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: patientPayload(ubs.id),
        });
        expect(reg.statusCode).toBe(201);
        const login = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: "maria@example.com", password: "senha-forte-1" },
        });
        expect(login.statusCode).toBe(200);
        expect(login.json()).toMatchObject({ user: { role: "patient" } });
        const cookie = String(login.headers["set-cookie"]);
        expect(cookie).toContain("logfarma_session=");
        expect(cookie).toContain("HttpOnly");
        const me = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            headers: { cookie: cookie.split(";")[0]! },
        });
        expect(me.statusCode).toBe(200);
        expect(me.json().user.role).toBe("patient");
    });

    it("login com senha errada responde 401 { message }", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: patientPayload(ubs.id),
        });
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: "maria@example.com", password: "errada-123" },
        });
        expect(res.statusCode).toBe(401);
        expect(typeof res.json().message).toBe("string");
    });

    it("email repetido no cadastro responde 409", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: patientPayload(ubs.id),
        });
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: patientPayload(ubs.id, { cns: "898001234567891" }),
        });
        expect(res.statusCode).toBe(409);
    });

    it("priority sem consent responde 400", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: patientPayload(ubs.id, { priority: { category: "chronic" } }),
        });
        expect(res.statusCode).toBe(400);
    });

    it("unidade de referência precisa ser pública (PFPB responde 400)", async () => {
        const app = buildTestApp();
        const pfpb = await createPharmacy({ name: "Drogaria X", kind: "pfpb", network: "pfpb" });
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: patientPayload(pfpb.id),
        });
        expect(res.statusCode).toBe(400);
    });

    it("GET /api/auth/me sem cookie responde 401", async () => {
        const app = buildTestApp();
        const res = await app.inject({ method: "GET", url: "/api/auth/me" });
        expect(res.statusCode).toBe(401);
    });

    it("requireRole('manager') com paciente responde 403", async () => {
        const app = buildTestApp();
        app.get(
            "/api/test/gestor",
            { preHandler: [requireAuth, requireRole("manager")] },
            async () => ({ ok: true }),
        );
        const ubs = await createPharmacy();
        await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: patientPayload(ubs.id),
        });
        const cookie = await loginAs(app, "maria@example.com");
        const res = await app.inject({
            method: "GET",
            url: "/api/test/gestor",
            headers: { cookie },
        });
        expect(res.statusCode).toBe(403);
    });

    it("senha não é guardada em texto", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: patientPayload(ubs.id),
        });
        const [user] = await testDb
            .select()
            .from(users)
            .where(eq(users.email, "maria@example.com"));
        expect(user!.passwordHash).not.toBe("senha-forte-1");
        expect(user!.passwordHash.startsWith("$argon2")).toBe(true);
    });

    it("logout limpa o cookie", async () => {
        const app = buildTestApp();
        const res = await app.inject({ method: "POST", url: "/api/auth/logout" });
        expect(res.statusCode).toBe(200);
        expect(String(res.headers["set-cookie"])).toContain("logfarma_session=;");
    });
});

describe("login pela aba certa (paciente ou equipe)", () => {
    beforeEach(() => resetDb());

    async function tryLogin(
        email: string,
        audience?: "patient" | "team",
        password = "senha-forte-1",
    ) {
        const app = buildTestApp();
        return app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email, password, ...(audience ? { audience } : {}) },
        });
    }

    it("farmacêutico na aba do paciente responde 403 sem abrir sessão", async () => {
        const ubs = await createPharmacy();
        const staff = await createStaff(ubs.id);
        const res = await tryLogin(staff.email, "patient");
        expect(res.statusCode).toBe(403);
        expect(res.json().message).toContain("Sou da equipe");
        expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("paciente na aba da equipe responde 403 sem abrir sessão", async () => {
        const ubs = await createPharmacy();
        const patient = await createPatient(ubs.id);
        const res = await tryLogin(patient.email, "team");
        expect(res.statusCode).toBe(403);
        expect(res.json().message).toContain("Sou paciente");
        expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("cada um na sua aba entra normalmente", async () => {
        const ubs = await createPharmacy();
        const staff = await createStaff(ubs.id);
        const patient = await createPatient(ubs.id);
        expect((await tryLogin(staff.email, "team")).statusCode).toBe(200);
        expect((await tryLogin(patient.email, "patient")).statusCode).toBe(200);
    });

    it("senha errada na aba errada continua 401 (não revela de quem é a conta)", async () => {
        const ubs = await createPharmacy();
        const staff = await createStaff(ubs.id);
        const res = await tryLogin(staff.email, "patient", "errada-123");
        expect(res.statusCode).toBe(401);
    });
});
