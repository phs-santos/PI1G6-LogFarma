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

/** Cookie + JWT. A sessão vive num cookie httpOnly; não há token no corpo das respostas. */
export const sessionPlugin = fp(async (app) => {
    await app.register(cookie);
    await app.register(jwt, {
        secret: env.jwtSecret,
        cookie: { cookieName: SESSION_COOKIE, signed: false },
        sign: { expiresIn: SESSION_SECONDS },
        formatUser: (payload) => ({ id: payload.sub, role: payload.role }),
    });
});

export async function setSessionCookie(reply: FastifyReply, user: SessionUser): Promise<void> {
    const token = await reply.jwtSign({ sub: user.id, role: user.role });
    reply.setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.cookieSecure,
        path: "/",
        maxAge: SESSION_SECONDS,
    });
}

export function clearSessionCookie(reply: FastifyReply): void {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
}
