import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { purchaseOrders } from "../db/schema.js";
import { requireAuth, requireRole } from "../auth/guards.js";
import { getSupplierStaffByUser } from "../services/accounts.js";
import {
    purchaseOrderViews,
    runSupplierAction,
    type SupplierAction,
} from "../services/purchasing.js";

const supplierActionSchema = {
    type: "object",
    required: ["action"],
    oneOf: [
        {
            additionalProperties: false,
            required: ["action", "expectedAt"],
            properties: {
                action: { const: "confirm" },
                expectedAt: { type: "string", format: "date" },
            },
        },
        {
            additionalProperties: false,
            required: ["action"],
            properties: { action: { const: "no_date" } },
        },
        {
            additionalProperties: false,
            required: ["action", "invoiceNumber", "batchNumber", "expiryDate", "quantity"],
            properties: {
                action: { const: "ship" },
                invoiceNumber: { type: "string", minLength: 1, maxLength: 40 },
                batchNumber: { type: "string", minLength: 1, maxLength: 40 },
                expiryDate: { type: "string", format: "date" },
                quantity: { type: "integer", minimum: 1, maximum: 100000 },
            },
        },
    ],
} as const;

// Atendente do fornecedor: só vê e responde os pedidos de compra feitos ao fornecedor dele.
export const supplierRoutes: FastifyPluginAsync = async (app) => {
    app.addHook("preHandler", requireAuth);
    app.addHook("preHandler", requireRole("supplier_staff"));

    app.get("/supplier/purchase-orders", async (request) => {
        const me = await getSupplierStaffByUser(app.db, request.user.id);
        return {
            items: await purchaseOrderViews(app.db, eq(purchaseOrders.supplierId, me.supplierId)),
        };
    });

    app.post<{ Params: { id: string }; Body: SupplierAction }>(
        "/supplier/purchase-orders/:id/actions",
        {
            schema: {
                params: {
                    type: "object",
                    required: ["id"],
                    properties: { id: { type: "string", format: "uuid" } },
                },
                body: supplierActionSchema,
            },
        },
        async (request) => {
            const me = await getSupplierStaffByUser(app.db, request.user.id);
            return {
                purchaseOrder: await runSupplierAction(
                    app.db,
                    me.supplierId,
                    request.params.id,
                    request.body,
                ),
            };
        },
    );
};
