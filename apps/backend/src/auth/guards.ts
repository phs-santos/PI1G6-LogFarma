import type { FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "../domain/errors.js";
import type { UserRole } from "../contracts.js";

/** preHandler: exige sessão válida e preenche request.user. */
export async function requireAuth(request: FastifyRequest): Promise<void> {
    try {
        await request.jwtVerify({ onlyCookie: true });
    } catch {
        throw new UnauthorizedError();
    }
}

/** preHandler (depois de requireAuth): exige um dos perfis. */
export function requireRole(...roles: UserRole[]) {
    return async (request: FastifyRequest): Promise<void> => {
        if (!roles.includes(request.user.role)) {
            throw new ForbiddenError();
        }
    };
}
