import type { FastifyPluginAsync } from "fastify";
import { asc } from "drizzle-orm";
import { suppliers } from "../db/schema.js";
import { requireAuth, requireRole } from "../auth/guards.js";

// Lista de fornecedores: a farmácia escolhe a quem pedir e o gestor cria atendentes.
export const supplierListRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        "/suppliers",
        { preHandler: [requireAuth, requireRole("pharmacy_staff", "manager")] },
        async () => {
            const rows = await app.db.select().from(suppliers).orderBy(asc(suppliers.name));
            return { items: rows.map(({ id, name, cnpj }) => ({ id, name, cnpj })) };
        },
    );
};
