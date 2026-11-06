import { ApiError, apiFetch } from "./client";
import type { LoginAudience, RegisterPatientInput, Session, SessionUser } from "./types";

/** Entra pela aba escolhida; a API recusa (403) conta de paciente na aba da equipe e vice-versa. */
export function login(email: string, password: string, audience: LoginAudience): Promise<Session> {
    return apiFetch<Session>("/auth/login", {
        method: "POST",
        body: { email, password, audience },
    });
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

/** Pede o link de nova senha; a resposta é a mesma exista a conta ou não. */
export async function forgotPassword(email: string): Promise<void> {
    await apiFetch<{ ok: true }>("/auth/password/forgot", { method: "POST", body: { email } });
}

/** Troca a senha com o código do link do e-mail. */
export async function resetPassword(token: string, password: string): Promise<void> {
    await apiFetch<{ ok: true }>("/auth/password/reset", {
        method: "POST",
        body: { token, password },
    });
}
