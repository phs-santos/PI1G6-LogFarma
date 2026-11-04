import type { FastifyPluginAsync } from "fastify";
import { requireAuth, requireRole } from "../auth/guards.js";
import {
    attachPrescription,
    createRequest,
    getPatientRequest,
    listPatientRequests,
    updatePatientRequest,
    type CreateRequestInput,
    type PrescriptionInput,
} from "../services/requests.js";
import { getStaffByUser } from "../services/accounts.js";

const idParams = {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", format: "uuid" } },
} as const;

export const prescriptionSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "issuedAt",
        "prescriberName",
        "prescriberCouncil",
        "prescriberNumber",
        "prescriberState",
        "continuousUse",
    ],
    properties: {
        issuedAt: { type: "string", format: "date" },
        prescriberName: { type: "string", minLength: 3, maxLength: 160 },
        prescriberCouncil: { type: "string", minLength: 2, maxLength: 10 },
        prescriberNumber: { type: "string", minLength: 1, maxLength: 20 },
        prescriberState: { type: "string", pattern: "^[A-Z]{2}$" },
        continuousUse: { type: "boolean" },
    },
} as const;

export const requestRoutes: FastifyPluginAsync = async (app) => {
    app.addHook("preHandler", requireAuth);

    app.post<{ Body: CreateRequestInput }>(
        "/requests",
        {
            preHandler: requireRole("patient"),
            schema: {
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["medicationId", "quantity", "fulfillment"],
                    not: { required: ["prescription", "prescriptionId"] },
                    properties: {
                        medicationId: { type: "string", format: "uuid" },
                        quantity: { type: "integer", minimum: 1, maximum: 100 },
                        fulfillment: { type: "string", enum: ["pickup", "delivery"] },
                        prescription: prescriptionSchema,
                        prescriptionId: { type: "string", format: "uuid" },
                    },
                },
            },
        },
        async (request, reply) =>
            reply
                .code(201)
                .send({ request: await createRequest(app.db, request.user.id, request.body) }),
    );

    app.get("/requests", { preHandler: requireRole("patient") }, async (request) => ({
        items: await listPatientRequests(app.db, request.user.id),
    }));

    app.get<{ Params: { id: string } }>(
        "/requests/:id",
        { preHandler: requireRole("patient"), schema: { params: idParams } },
        async (request) => ({
            request: await getPatientRequest(app.db, request.user.id, request.params.id),
        }),
    );

    app.patch<{
        Params: { id: string };
        Body: { fulfillment?: "pickup" | "delivery"; cancel?: true };
    }>(
        "/requests/:id",
        {
            preHandler: requireRole("patient"),
            schema: {
                params: idParams,
                body: {
                    type: "object",
                    additionalProperties: false,
                    oneOf: [{ required: ["fulfillment"] }, { required: ["cancel"] }],
                    properties: {
                        fulfillment: { type: "string", enum: ["pickup", "delivery"] },
                        cancel: { type: "boolean", const: true },
                    },
                },
            },
        },
        async (request) => ({
            request: await updatePatientRequest(
                app.db,
                request.user.id,
                request.params.id,
                request.body,
            ),
        }),
    );

    app.post<{ Params: { id: string }; Body: PrescriptionInput }>(
        "/requests/:id/prescription",
        {
            preHandler: requireRole("patient", "pharmacy_staff"),
            schema: { params: idParams, body: prescriptionSchema },
        },
        async (request) => {
            const actor =
                request.user.role === "pharmacy_staff"
                    ? {
                          ...request.user,
                          pharmacyId: (await getStaffByUser(app.db, request.user.id)).pharmacyId,
                      }
                    : request.user;
            return {
                request: await attachPrescription(app.db, actor, request.params.id, request.body),
            };
        },
    );
};
