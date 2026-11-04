import { ApiError, apiFetch } from "./client";
import type { RegisterPatientInput, Session, SessionUser } from "./types";

export function login(email: string, password: string): Promise<Session> {
    return apiFetch<Session>("/auth/login", { method: "POST", body: { email, password } });
}

export async function logout(): Promise<void> {
    await apiFetch<{ ok: true }>("/auth/logout", { method: "POST" });
}

/** Quem está com a sessão aberta; `null` quando ninguém entrou. */
export async function getMe(): Promise<Session | null> {
    try {
        return await apiFetch<Session>("/auth/me");
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
    }
}

export function register(input: RegisterPatientInput): Promise<{ user: SessionUser }> {
    return apiFetch<{ user: SessionUser }>("/auth/register", { method: "POST", body: input });
}
