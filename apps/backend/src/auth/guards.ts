import type { FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import { ForbiddenError, UnauthorizedError } from "../domain/errors.js";
import type { UserRole } from "../contracts.js";

/**
 * preHandler: exige sessão válida e preenche request.user. A conta precisa continuar ativa:
 * desativar uma conta na gestão corta o acesso na hora, sem esperar o cookie vencer.
 */
export async function requireAuth(request: FastifyRequest): Promise<void> {
    try {
        await request.jwtVerify({ onlyCookie: true });
    } catch {
        throw new UnauthorizedError();
    }
    const [row] = await request.server.db
        .select({ active: users.active })
        .from(users)
        .where(eq(users.id, request.user.id));
    if (!row?.active) throw new UnauthorizedError("Sua conta não está ativa.");
}

/** preHandler (depois de requireAuth): exige um dos perfis. */
export function requireRole(...roles: UserRole[]) {
    return async (request: FastifyRequest): Promise<void> => {
        if (!roles.includes(request.user.role)) {
            throw new ForbiddenError();
        }
    };
}
