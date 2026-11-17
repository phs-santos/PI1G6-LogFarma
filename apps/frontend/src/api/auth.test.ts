import { afterEach, describe, expect, it, vi } from "vitest";
import { mockApi } from "../../test/mockApi";
import { getMe, login, logout } from "./auth";

const SESSION = {
    user: { id: "u1", role: "patient" },
    profile: { kind: "patient", fullName: "Maria" },
};

/** Cabeçalho Authorization da última chamada ao fetch. */
function lastAuthorization(): string | undefined {
    const calls = vi.mocked(fetch).mock.calls;
    const init = calls[calls.length - 1]?.[1];
    return (init?.headers as Record<string, string> | undefined)?.Authorization;
}

// API em outro domínio: o cookie entre sites é bloqueado, então a sessão vai no cabeçalho.
describe("sessão pelo token", () => {
    afterEach(() => localStorage.clear());

    it("guarda o token do login e manda em Authorization nas próximas chamadas", async () => {
        mockApi({
            "POST /api/auth/login": { body: { ...SESSION, token: "tok-123" } },
            "GET /api/auth/me": { body: SESSION },
        });
        const session = await login("maria@example.com", "senha-forte-1", "patient");
        expect(session).not.toHaveProperty("token");
        await getMe();
        expect(lastAuthorization()).toBe("Bearer tok-123");
    });

    it("esquece o token ao sair e quando a API responde 401", async () => {
        const api = mockApi({
            "POST /api/auth/login": { body: { ...SESSION, token: "tok-123" } },
            "POST /api/auth/logout": { body: { ok: true } },
            "GET /api/auth/me": { status: 401, body: { message: "Entre de novo." } },
        });
        await login("maria@example.com", "senha-forte-1", "patient");
        await logout();
        await getMe();
        expect(lastAuthorization()).toBeUndefined();

        api.set("POST /api/auth/login", { body: { ...SESSION, token: "tok-456" } });
        await login("maria@example.com", "senha-forte-1", "patient");
        expect(await getMe()).toBeNull();
        await getMe();
        expect(lastAuthorization()).toBeUndefined();
    });
});
