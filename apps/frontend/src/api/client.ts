/** Erro devolvido pela API, com a mensagem pronta para mostrar na tela. */
export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

/** Evento disparado em qualquer 401; a sessão (src/app/session.tsx) decide o que fazer. */
export const UNAUTHORIZED_EVENT = "logfarma:unauthorized";

type Query = Record<string, string | number | boolean | undefined>;

export interface ApiInit {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    query?: Query;
}

const NETWORK_MESSAGE = "Sem conexão com o sistema. Verifique a internet e tente de novo.";

function buildUrl(path: string, query?: Query): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined) params.set(key, String(value));
    }
    const qs = params.toString();
    return `/api${path}${qs ? `?${qs}` : ""}`;
}

function messageOf(body: unknown, status: number): string {
    if (typeof body === "object" && body !== null && "message" in body) {
        const { message } = body as { message: unknown };
        if (typeof message === "string" && message) return message;
    }
    return status >= 500
        ? "O sistema está com problema. Tente de novo em instantes."
        : "Não foi possível concluir. Tente de novo.";
}

/** Única porta de saída para a API: JSON, cookie de sessão e erro em português. */
export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
    let res: Response;
    try {
        res = await fetch(buildUrl(path, init.query), {
            method: init.method ?? "GET",
            credentials: "same-origin",
            headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
            body: init.body === undefined ? undefined : JSON.stringify(init.body),
        });
    } catch {
        throw new ApiError(0, NETWORK_MESSAGE);
    }
    const text = await res.text();
    let body: unknown = undefined;
    if (text) {
        try {
            body = JSON.parse(text);
        } catch {
            body = undefined;
        }
    }
    if (!res.ok) {
        if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
        throw new ApiError(res.status, messageOf(body, res.status));
    }
    return body as T;
}
