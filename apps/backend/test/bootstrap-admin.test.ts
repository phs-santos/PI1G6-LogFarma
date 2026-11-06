import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../src/db/schema.js";
import { adminPasswordProblem, ensureFirstManager } from "../src/services/bootstrap-admin.js";
import { buildTestApp, createManager, loginAs, resetDb, testDb } from "./helpers.js";

const dev = { nodeEnv: "development", name: "Administrador" };

describe("primeiro gestor pelo ADMIN_EMAIL/ADMIN_PASSWORD", () => {
    beforeEach(() => resetDb());

    it("cria o gestor quando não há nenhum, e ele entra pela aba da equipe", async () => {
        const result = await ensureFirstManager(testDb, {
            ...dev,
            email: "Admin@Exemplo.test",
            password: "senha-forte-1",
        });
        expect(result).toEqual({ status: "created" });
        const [row] = await testDb.select().from(users).where(eq(users.role, "manager"));
        expect(row?.email).toBe("admin@exemplo.test");
        expect(row?.passwordHash).not.toBe("senha-forte-1");

        const app = buildTestApp();
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: { email: "admin@exemplo.test", password: "senha-forte-1", audience: "team" },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().user.role).toBe("manager");
    });

    it("com gestor já existente não cria nem altera nada", async () => {
        const existing = await createManager("gestor@exemplo.test");
        const result = await ensureFirstManager(testDb, {
            ...dev,
            email: "gestor@exemplo.test",
            password: "outra-senha-qualquer",
        });
        expect(result).toEqual({ status: "exists" });
        expect(await testDb.select().from(users)).toHaveLength(1);
        // A senha antiga continua valendo: a env nunca sobrescreve a conta.
        await expect(loginAs(buildTestApp(), existing.email)).resolves.toContain("=");
    });

    it("sem as variáveis não faz nada", async () => {
        expect(await ensureFirstManager(testDb, dev)).toEqual({ status: "skipped" });
        expect(await testDb.select().from(users)).toHaveLength(0);
    });

    it("em produção recusa senha fraca e não cria a conta", async () => {
        const result = await ensureFirstManager(testDb, {
            nodeEnv: "production",
            name: "Administrador",
            email: "admin@exemplo.test",
            password: "admin1234",
        });
        expect(result.status).toBe("refused");
        expect(await testDb.select().from(users)).toHaveLength(0);
    });
});

describe("adminPasswordProblem", () => {
    it("fora de produção aceita qualquer senha", () => {
        expect(adminPasswordProblem("development", "admin1234")).toBeNull();
    });
    it("em produção exige 12 caracteres e recusa senha conhecida", () => {
        expect(adminPasswordProblem("production", "curta-123")).toContain("12 caracteres");
        expect(adminPasswordProblem("production", "troque-esta-senha")).toContain("conhecida");
        expect(adminPasswordProblem("production", "uma-senha-bem-longa-42")).toBeNull();
    });
});
