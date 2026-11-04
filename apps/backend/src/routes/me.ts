import type { FastifyPluginAsync } from "fastify";
import { requireAuth, requireRole } from "../auth/guards.js";
import { listPatientPrescriptions } from "../services/requests.js";
import {
    addCaregiver,
    getProfile,
    listCaregivers,
    removeCaregiver,
    updateProfile,
    type ProfilePatch,
} from "../services/profile.js";
import { clearRecentMedications, listRecentMedications } from "../services/search-history.js";

const addressSchema = {
    type: "object",
    required: ["street", "number", "district", "city", "state", "zip"],
    additionalProperties: false,
    properties: {
        street: { type: "string", minLength: 1, maxLength: 160 },
        number: { type: "string", minLength: 1, maxLength: 20 },
        district: { type: "string", minLength: 1, maxLength: 100 },
        city: { type: "string", minLength: 1, maxLength: 100 },
        state: { type: "string", pattern: "^[A-Z]{2}$" },
        zip: { type: "string", pattern: "^\\d{8}$" },
    },
} as const;

const patchSchema = {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: {
        phone: { type: "string", pattern: "^\\d{10,11}$" },
        address: addressSchema,
        latitude: { type: ["number", "null"], minimum: -90, maximum: 90 },
        longitude: { type: ["number", "null"], minimum: -180, maximum: 180 },
        mobilityLimited: { type: "boolean" },
        referencePharmacyId: { type: "string", format: "uuid" },
        priority: {
            oneOf: [
                {
                    type: "object",
                    additionalProperties: false,
                    required: ["category", "consent"],
                    properties: {
                        category: { type: "string", enum: ["chronic", "oncology", "rare_disease"] },
                        consent: { type: "boolean", const: true },
                    },
                },
                {
                    type: "object",
                    additionalProperties: false,
                    required: ["revoke"],
                    properties: { revoke: { type: "boolean", const: true } },
                },
            ],
        },
    },
} as const;

export const meRoutes: FastifyPluginAsync = async (app) => {
    app.addHook("preHandler", requireAuth);
    app.addHook("preHandler", requireRole("patient"));

    app.get("/me", async (request) => ({ profile: await getProfile(app.db, request.user.id) }));

    app.patch<{ Body: ProfilePatch }>(
        "/me",
        { schema: { body: patchSchema } },
        async (request) => ({
            profile: await updateProfile(app.db, request.user.id, request.body),
        }),
    );

    app.get<{ Querystring: { medicationId?: string } }>(
        "/me/prescriptions",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: { medicationId: { type: "string", format: "uuid" } },
                },
            },
        },
        async (request) => ({
            items: await listPatientPrescriptions(
                app.db,
                request.user.id,
                request.query.medicationId,
            ),
        }),
    );

    app.get("/me/recent-medications", async (request) => ({
        items: await listRecentMedications(app.db, request.user.id),
    }));

    app.delete("/me/recent-medications", async (request) => {
        await clearRecentMedications(app.db, request.user.id);
        return { ok: true };
    });

    app.get("/me/caregivers", async (request) => ({
        items: await listCaregivers(app.db, request.user.id),
    }));

    app.post<{ Body: { fullName: string; document: string; relationship: string; phone: string } }>(
        "/me/caregivers",
        {
            schema: {
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["fullName", "document", "relationship", "phone"],
                    properties: {
                        fullName: { type: "string", minLength: 3, maxLength: 160 },
                        document: { type: "string", minLength: 5, maxLength: 20 },
                        relationship: { type: "string", minLength: 2, maxLength: 40 },
                        phone: { type: "string", pattern: "^\\d{10,11}$" },
                    },
                },
            },
        },
        async (request, reply) =>
            reply
                .code(201)
                .send({ caregiver: await addCaregiver(app.db, request.user.id, request.body) }),
    );

    app.delete<{ Params: { id: string } }>(
        "/me/caregivers/:id",
        {
            schema: {
                params: {
                    type: "object",
                    required: ["id"],
                    properties: { id: { type: "string", format: "uuid" } },
                },
            },
        },
        async (request) => {
            await removeCaregiver(app.db, request.user.id, request.params.id);
            return { ok: true };
        },
    );
};
