import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { passwordResetTokens, users } from "../src/db/schema.js";
import { buildTestApp, createPharmacy, createStaff, outbox, resetDb, testDb } from "./helpers.js";

/** Pega o código do link do último e-mail. */
function tokenFromOutbox(): string {
    const email = outbox.at(-1);
    const match = email?.text.match(/nova-senha\?codigo=([\w-]+)/);
    if (!match?.[1]) throw new Error("nenhum link de recuperação no e-mail");
    return match[1];
}

describe("recuperar senha", () => {
    beforeEach(async () => {
        await resetDb();
        outbox.length = 0;
    });

    async function setup() {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const staff = await createStaff(ubs.id);
        return { app, staff };
    }

    const forgot = (app: ReturnType<typeof buildTestApp>, email: string) =>
        app.inject({ method: "POST", url: "/api/auth/password/forgot", payload: { email } });
    const reset = (app: ReturnType<typeof buildTestApp>, token: string, password: string) =>
        app.inject({
            method: "POST",
            url: "/api/auth/password/reset",
            payload: { token, password },
        });
    const login = (app: ReturnType<typeof buildTestApp>, email: string, password: string) =>
        app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });

    it("e-mail com conta recebe o link; o banco guarda só o hash", async () => {
        const { app, staff } = await setup();
        const res = await forgot(app, staff.email.toUpperCase());
        expect(res.statusCode).toBe(200);
        expect(outbox).toHaveLength(1);
        expect(outbox[0]!.to).toBe(staff.email);
        const token = tokenFromOutbox();
        const rows = await testDb.select().from(passwordResetTokens);
        expect(rows).toHaveLength(1);
        expect(rows[0]!.tokenHash).not.toBe(token);
    });

    it("e-mail sem conta responde igual e não manda nada", async () => {
        const { app } = await setup();
        const res = await forgot(app, "ninguem@example.com");
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ ok: true });
        expect(outbox).toHaveLength(0);
    });

    it("conta desativada não recebe link", async () => {
        const { app, staff } = await setup();
        await testDb.update(users).set({ active: false }).where(eq(users.id, staff.id));
        await forgot(app, staff.email);
        expect(outbox).toHaveLength(0);
    });

    it("o link troca a senha uma vez só", async () => {
        const { app, staff } = await setup();
        await forgot(app, staff.email);
        const token = tokenFromOutbox();

        expect((await reset(app, token, "senha-nova-123")).statusCode).toBe(200);
        expect((await login(app, staff.email, "senha-nova-123")).statusCode).toBe(200);
        expect((await login(app, staff.email, "senha-forte-1")).statusCode).toBe(401);

        const again = await reset(app, token, "outra-senha-456");
        expect(again.statusCode).toBe(400);
        expect(again.json().message).toContain("Peça um novo");
    });

    it("usar um link invalida os outros pendentes", async () => {
        const { app, staff } = await setup();
        await forgot(app, staff.email);
        const first = tokenFromOutbox();
        await forgot(app, staff.email);
        const second = tokenFromOutbox();
        expect((await reset(app, second, "senha-nova-123")).statusCode).toBe(200);
        expect((await reset(app, first, "outra-senha-456")).statusCode).toBe(400);
    });

    it("link vencido (mais de 30 min) não vale", async () => {
        const { app, staff } = await setup();
        await forgot(app, staff.email);
        const token = tokenFromOutbox();
        await testDb.update(passwordResetTokens).set({ expiresAt: new Date(Date.now() - 1000) });
        expect((await reset(app, token, "senha-nova-123")).statusCode).toBe(400);
    });

    it("código inventado não vale", async () => {
        const { app } = await setup();
        expect((await reset(app, "codigo-inventado-123", "senha-nova-123")).statusCode).toBe(400);
    });

    it("senha nova curta responde 400", async () => {
        const { app, staff } = await setup();
        await forgot(app, staff.email);
        expect((await reset(app, tokenFromOutbox(), "curta")).statusCode).toBe(400);
    });
});
