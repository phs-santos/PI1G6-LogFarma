import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyReply } from "fastify";
import { env } from "../env.js";
import type { SessionUser, UserRole } from "../contracts.js";

export const SESSION_COOKIE = "logfarma_session";
const SESSION_SECONDS = 8 * 60 * 60;

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: { sub: string; role: UserRole };
        user: SessionUser;
    }
}

/**
 * Cookie + JWT. A sessão vai em dois lugares: num cookie httpOnly (telas no mesmo domínio da API)
 * e no corpo da resposta de login/cadastro, para as telas em outro domínio mandarem no cabeçalho
 * `Authorization: Bearer` (cookie entre sites é bloqueado pelo Safari e pode ser pelo Chrome).
 */
export const sessionPlugin = fp(async (app) => {
    await app.register(cookie);
    await app.register(jwt, {
        secret: env.jwtSecret,
        cookie: { cookieName: SESSION_COOKIE, signed: false },
        sign: { expiresIn: SESSION_SECONDS },
        formatUser: (payload) => ({ id: payload.sub, role: payload.role }),
    });
});

/** Abre a sessão: grava o cookie e devolve o mesmo token para ir no corpo da resposta. */
export async function setSessionCookie(reply: FastifyReply, user: SessionUser): Promise<string> {
    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    reply.setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.cookieSecure,
        path: "/",
        maxAge: SESSION_SECONDS,
    });
    return token;
}

export function clearSessionCookie(reply: FastifyReply): void {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
}
