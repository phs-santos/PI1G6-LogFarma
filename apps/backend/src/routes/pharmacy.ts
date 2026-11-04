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
import { purchaseOrders } from "../db/schema.js";
import { purchaseOrderViews, receivePurchaseOrder, waitlistView } from "../services/purchasing.js";
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
