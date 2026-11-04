import type { FastifyPluginAsync } from "fastify";
import { requireAuth, requireRole } from "../auth/guards.js";
import { getCourierByUser } from "../services/accounts.js";
import { courierDeliveries, runCourierAction, type CourierAction } from "../services/deliveries.js";

const courierActionSchema = {
    type: "object",
    required: ["action"],
    oneOf: [
        {
            additionalProperties: false,
            required: ["action"],
            properties: { action: { const: "accept" } },
        },
        {
            additionalProperties: false,
            required: ["action"],
            properties: { action: { const: "pick_up" } },
        },
        {
            additionalProperties: false,
            required: ["action", "receivedBy"],
            properties: {
                action: { const: "deliver" },
                receivedBy: { type: "string", minLength: 1, maxLength: 120 },
            },
        },
        {
            additionalProperties: false,
            required: ["action", "reason"],
            properties: {
                action: { const: "fail" },
                reason: { type: "string", minLength: 1, maxLength: 200 },
            },
        },
    ],
} as const;

// Entregador do programa municipal: vê as entregas disponíveis e as dele.
export const courierRoutes: FastifyPluginAsync = async (app) => {
    app.addHook("preHandler", requireAuth);
    app.addHook("preHandler", requireRole("courier"));

    app.get<{ Querystring: { scope?: "available" | "mine" } }>(
        "/courier/deliveries",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: { scope: { type: "string", enum: ["available", "mine"] } },
                },
            },
        },
        async (request) => {
            const me = await getCourierByUser(app.db, request.user.id);
            return {
                items: await courierDeliveries(app.db, me.userId, request.query.scope ?? "mine"),
            };
        },
    );

    app.post<{ Params: { id: string }; Body: CourierAction }>(
        "/courier/deliveries/:id/actions",
        {
            schema: {
                params: {
                    type: "object",
                    required: ["id"],
                    properties: { id: { type: "string", format: "uuid" } },
                },
                body: courierActionSchema,
            },
        },
        async (request) => {
            const me = await getCourierByUser(app.db, request.user.id);
            return {
                delivery: await runCourierAction(
                    app.db,
                    me.userId,
                    request.params.id,
                    request.body,
                ),
            };
        },
    );
};
