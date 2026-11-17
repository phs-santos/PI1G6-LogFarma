import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createPharmacy, patientPayload, resetDb } from "./helpers.js";

// Telas em outro domínio (ex.: site do professor chamando api-logfarma...): sessão pelo
// cabeçalho Authorization e só os sites do CORS_ORIGIN (nos testes, http://localhost:5173).
describe("API em domínio próprio", () => {
    beforeEach(() => resetDb());

    async function loginBody(app: ReturnType<typeof buildTestApp>) {
        const ubs = await createPharmacy();
        const reg = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: patientPayload(ubs.id),
        });
        expect(reg.statusCode).toBe(201);
        expect(typeof reg.json().token).toBe("string");
        const login = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: "maria@example.com", password: "senha-forte-1" },
        });
        expect(login.statusCode).toBe(200);
        return login.json() as { token: string };
    }

    it("login devolve o token e ele abre a sessão pelo cabeçalho Bearer", async () => {
        const app = buildTestApp();
        const { token } = await loginBody(app);
        const me = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            headers: { authorization: `Bearer ${token}` },
        });
        expect(me.statusCode).toBe(200);
        expect(me.json().user.role).toBe("patient");
    });

    it("token inválido no cabeçalho responde 401", async () => {
        const app = buildTestApp();
        const me = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            headers: { authorization: "Bearer nao-e-um-token" },
        });
        expect(me.statusCode).toBe(401);
    });

    it("site liberado recebe os cabeçalhos de CORS", async () => {
        const app = buildTestApp();
        const res = await app.inject({
            method: "OPTIONS",
            url: "/api/auth/login",
            headers: {
                origin: "http://localhost:5173",
                "access-control-request-method": "POST",
                "access-control-request-headers": "content-type,authorization",
            },
        });
        expect(res.statusCode).toBe(204);
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });

    it("site fora da lista recebe 403, até no preflight", async () => {
        const app = buildTestApp();
        const preflight = await app.inject({
            method: "OPTIONS",
            url: "/api/auth/login",
            headers: {
                origin: "https://site-qualquer.example",
                "access-control-request-method": "POST",
            },
        });
        expect(preflight.statusCode).toBe(403);
        const login = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            headers: { origin: "https://site-qualquer.example" },
            payload: { email: "maria@example.com", password: "senha-forte-1" },
        });
        expect(login.statusCode).toBe(403);
        expect(login.json().message).toBe("Este site não tem permissão para usar a API.");
    });

    it("a própria tela, no mesmo domínio da API, passa sem estar na lista", async () => {
        const app = buildTestApp();
        const res = await app.inject({
            method: "GET",
            url: "/api/health",
            headers: {
                origin: "https://logfarma.exemplo.test",
                host: "logfarma.exemplo.test",
            },
        });
        expect(res.statusCode).toBe(200);
    });
});
