// Rotas do profissional da farmácia: tudo é da unidade em que ele trabalha.
import type { FastifyPluginAsync } from "fastify";
import { requireAuth, requireRole } from "../auth/guards.js";
import { getStaffByUser } from "../services/accounts.js";
import { checkPrescription } from "../services/requests.js";

export const idParams = {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", format: "uuid" } },
} as const;

export const pharmacyRoutes: FastifyPluginAsync = async (app) => {
    app.addHook("preHandler", requireAuth);
    app.addHook("preHandler", requireRole("pharmacy_staff"));

    app.post<{ Params: { id: string } }>(
        "/pharmacy/prescriptions/:id/check",
        { schema: { params: idParams } },
        async (request) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            return { prescription: await checkPrescription(app.db, staff, request.params.id) };
        },
    );
};
