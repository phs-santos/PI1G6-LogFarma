import { vi } from "vitest";

export interface MockReply {
    status?: number;
    body?: unknown;
}
export type MockHandler = MockReply | ((req: { body: unknown; url: URL }) => MockReply);

export interface ApiCall {
    method: string;
    path: string;
    body: unknown;
}

/**
 * Troca o fetch global por respostas fixas, por "MÉTODO /api/caminho".
 * Chamada sem resposta cadastrada devolve 404 e fica registrada em `calls`.
 */
export function mockApi(routes: Record<string, MockHandler> = {}) {
    const table = new Map(Object.entries(routes));
    const calls: ApiCall[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input), "http://localhost");
        const method = (init?.method ?? "GET").toUpperCase();
        const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
        calls.push({ method, path: url.pathname, body });
        const handler = table.get(`${method} ${url.pathname}`);
        const reply: MockReply =
            handler === undefined
                ? {
                      status: 404,
                      body: { message: `Sem resposta de teste para ${method} ${url.pathname}` },
                  }
                : typeof handler === "function"
                  ? handler({ body, url })
                  : handler;
        return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
            status: reply.status ?? 200,
            headers: { "Content-Type": "application/json" },
        });
    });
    vi.stubGlobal("fetch", fetchMock);
    return {
        calls,
        set(key: string, handler: MockHandler) {
            table.set(key, handler);
        },
    };
}
