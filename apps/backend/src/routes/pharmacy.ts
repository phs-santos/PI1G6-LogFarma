// Rotas do profissional da farmácia: tudo é da unidade em que ele trabalha.
import type { FastifyPluginAsync } from "fastify";
import { requireAuth, requireRole } from "../auth/guards.js";
import { getStaffByUser } from "../services/accounts.js";
import { checkPrescription } from "../services/requests.js";
import { listPharmacyRequests, runCounterAction, type CounterAction } from "../services/counter.js";
import type { RequestStatus } from "../domain/request-status.js";
// Import com efeito: registra as ações de balcão "request_transfer" (e, na Task 10, "order_from_supplier").
import "../services/transfers.js";
import "../services/purchasing-actions.js";
import { eq } from "drizzle-orm";
import { purchaseOrders, stockBatches } from "../db/schema.js";
import { purchaseOrderViews, receivePurchaseOrder, waitlistView } from "../services/purchasing.js";
import { pharmacyDeliveries } from "../services/deliveries.js";
import { setMinQuantity, unitStock } from "../services/reports.js";
import { addBatch, adjustBatch } from "../services/stock.js";
import { NotFoundError } from "../domain/errors.js";
import { listTransfers, runTransferAction, type TransferAction } from "../services/transfers.js";

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

    app.get<{ Querystring: { status?: RequestStatus } }>(
        "/pharmacy/requests",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: { status: { type: "string", enum: REQUEST_STATUSES } },
                },
            },
        },
        async (request) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            return { items: await listPharmacyRequests(app.db, staff, request.query.status) };
        },
    );

    app.post<{ Params: { id: string }; Body: CounterAction }>(
        "/pharmacy/requests/:id/actions",
        { schema: { params: idParams, body: counterActionSchema } },
        async (request) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            return {
                request: await runCounterAction(app.db, staff, request.params.id, request.body),
            };
        },
    );

    app.get<{ Querystring: { direction?: "incoming" | "outgoing" } }>(
        "/pharmacy/transfers",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: { direction: { type: "string", enum: ["incoming", "outgoing"] } },
                },
            },
        },
        async (request) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            return { items: await listTransfers(app.db, staff, request.query.direction) };
        },
    );

    app.post<{ Params: { id: string }; Body: TransferAction }>(
        "/pharmacy/transfers/:id/actions",
        { schema: { params: idParams, body: transferActionSchema } },
        async (request) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            return {
                transfer: await runTransferAction(app.db, staff, request.params.id, request.body),
            };
        },
    );

    app.get("/pharmacy/stock", async (request) => {
        const staff = await getStaffByUser(app.db, request.user.id);
        return { items: await unitStock(app.db, staff.pharmacyId) };
    });

    app.patch<{ Params: { medicationId: string }; Body: { minQuantity: number } }>(
        "/pharmacy/stock/:medicationId",
        {
            schema: {
                params: {
                    type: "object",
                    required: ["medicationId"],
                    properties: { medicationId: { type: "string", format: "uuid" } },
                },
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["minQuantity"],
                    properties: { minQuantity: { type: "integer", minimum: 0, maximum: 100000 } },
                },
            },
        },
        async (request) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            await setMinQuantity(
                app.db,
                staff.pharmacyId,
                request.params.medicationId,
                request.body.minQuantity,
            );
            return { ok: true };
        },
    );

    app.post<{
        Body: {
            medicationId: string;
            batchNumber: string;
            expiryDate: string;
            quantity: number;
            manufacturerCnpj?: string;
            anvisaRegistration?: string;
        };
    }>(
        "/pharmacy/stock/batches",
        {
            schema: {
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["medicationId", "batchNumber", "expiryDate", "quantity"],
                    properties: {
                        medicationId: { type: "string", format: "uuid" },
                        batchNumber: { type: "string", minLength: 1, maxLength: 40 },
                        expiryDate: { type: "string", format: "date" },
                        quantity: { type: "integer", minimum: 1, maximum: 100000 },
                        manufacturerCnpj: { type: "string", pattern: "^\\d{14}$" },
                        anvisaRegistration: { type: "string", minLength: 1, maxLength: 20 },
                    },
                },
            },
        },
        async (request, reply) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            const batchId = await app.db.transaction((tx) =>
                addBatch(tx, {
                    ...request.body,
                    pharmacyId: staff.pharmacyId,
                    movementType: "adjustment",
                    staffUserId: staff.userId,
                }),
            );
            return reply.code(201).send({ batchId });
        },
    );

    app.post<{
        Params: { id: string };
        Body: { delta: number; reason: "exit_loss" | "adjustment" };
    }>(
        "/pharmacy/stock/batches/:id/adjust",
        {
            schema: {
                params: idParams,
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["delta", "reason"],
                    properties: {
                        delta: {
                            type: "integer",
                            minimum: -100000,
                            maximum: 100000,
                            not: { const: 0 },
                        },
                        reason: { type: "string", enum: ["exit_loss", "adjustment"] },
                    },
                },
            },
        },
        async (request) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            await app.db.transaction(async (tx) => {
                const [batch] = await tx
                    .select()
                    .from(stockBatches)
                    .where(eq(stockBatches.id, request.params.id));
                if (!batch || batch.pharmacyId !== staff.pharmacyId)
                    throw new NotFoundError("Lote não encontrado.");
                await adjustBatch(tx, {
                    batchId: batch.id,
                    delta: request.body.delta,
                    reason: request.body.reason,
                    staffUserId: staff.userId,
                });
            });
            return { ok: true };
        },
    );

    app.get("/pharmacy/deliveries", async (request) => {
        const staff = await getStaffByUser(app.db, request.user.id);
        return { items: await pharmacyDeliveries(app.db, staff.pharmacyId) };
    });

    app.get("/pharmacy/purchase-orders", async (request) => {
        const staff = await getStaffByUser(app.db, request.user.id);
        return {
            items: await purchaseOrderViews(
                app.db,
                eq(purchaseOrders.pharmacyId, staff.pharmacyId),
            ),
        };
    });

    app.post<{ Params: { id: string }; Body: { action: "receive" } }>(
        "/pharmacy/purchase-orders/:id/actions",
        {
            schema: {
                params: idParams,
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["action"],
                    properties: { action: { const: "receive" } },
                },
            },
        },
        async (request) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            return { purchaseOrder: await receivePurchaseOrder(app.db, staff, request.params.id) };
        },
    );

    app.get<{ Querystring: { medicationId: string } }>(
        "/pharmacy/waitlist",
        {
            schema: {
                querystring: {
                    type: "object",
                    required: ["medicationId"],
                    properties: { medicationId: { type: "string", format: "uuid" } },
                },
            },
        },
        async (request) => {
            const staff = await getStaffByUser(app.db, request.user.id);
            return {
                items: await waitlistView(app.db, staff.pharmacyId, request.query.medicationId),
            };
        },
    );
};

const transferActionSchema = {
    type: "object",
    required: ["action"],
    oneOf: [
        {
            additionalProperties: false,
            required: ["action"],
            properties: { action: { const: "ship" } },
        },
        {
            additionalProperties: false,
            required: ["action"],
            properties: { action: { const: "receive" } },
        },
        {
            additionalProperties: false,
            required: ["action", "reason"],
            properties: {
                action: { const: "refuse" },
                reason: { type: "string", minLength: 1, maxLength: 200 },
            },
        },
    ],
} as const;

const REQUEST_STATUSES = [
    "requested",
    "ready_for_pickup",
    "in_transfer",
    "waitlisted",
    "arrived",
    "delivery_scheduled",
    "out_for_delivery",
    "picked_up",
    "delivered",
    "cancelled",
];

const uuid = { type: "string", format: "uuid" } as const;

const counterActionSchema = {
    type: "object",
    required: ["action"],
    oneOf: [
        {
            additionalProperties: false,
            properties: { action: { const: "prepare" } },
            required: ["action"],
        },
        {
            additionalProperties: false,
            required: ["action", "pickedUpBy"],
            properties: {
                action: { const: "dispense" },
                pickedUpBy: { type: "string", enum: ["patient", "caregiver"] },
                caregiverId: uuid,
            },
        },
        {
            additionalProperties: false,
            required: ["action", "scheduledWindow"],
            properties: {
                action: { const: "schedule_delivery" },
                scheduledWindow: { type: "string", minLength: 1, maxLength: 60 },
                courierId: uuid,
            },
        },
        {
            additionalProperties: false,
            required: ["action", "fromPharmacyId"],
            properties: { action: { const: "request_transfer" }, fromPharmacyId: uuid },
        },
        {
            additionalProperties: false,
            required: ["action"],
            properties: { action: { const: "order_from_supplier" }, supplierId: uuid },
        },
    ],
} as const;
