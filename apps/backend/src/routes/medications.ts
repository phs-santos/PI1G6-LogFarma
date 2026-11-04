import type { FastifyPluginAsync } from "fastify";
import { requireAuth, requireRole } from "../auth/guards.js";
import {
    createMedication,
    getMedication,
    searchMedications,
    updateMedication,
    type MedicationInput,
} from "../services/medications.js";
import { medicationAvailability } from "../services/availability.js";

const idParams = {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", format: "uuid" } },
} as const;

const medicationProperties = {
    activeIngredient: { type: "string", minLength: 2, maxLength: 160 },
    concentration: { type: "string", minLength: 1, maxLength: 60 },
    pharmaceuticalForm: {
        type: "string",
        enum: [
            "tablet",
            "capsule",
            "oral_solution",
            "oral_suspension",
            "injectable",
            "cream",
            "inhaler",
            "other",
        ],
    },
    route: {
        type: "string",
        enum: [
            "oral",
            "subcutaneous",
            "intramuscular",
            "intravenous",
            "topical",
            "inhalation",
            "other",
        ],
    },
    dispensingUnit: { type: "string", minLength: 1, maxLength: 40 },
    component: { type: "string", enum: ["basic", "strategic", "specialized"] },
    therapeuticClass: { type: "string", minLength: 2, maxLength: 80 },
    prescriptionType: {
        type: "string",
        enum: ["none", "simple", "antimicrobial", "special_control"],
    },
    storage: { type: "string", enum: ["room_temperature", "refrigerated"] },
    inRename: { type: "boolean" },
    inFarmaciaPopular: { type: "boolean" },
    catmatCode: { type: "string", maxLength: 20 },
} as const;

const createBody = {
    type: "object",
    additionalProperties: false,
    required: [
        "activeIngredient",
        "concentration",
        "pharmaceuticalForm",
        "route",
        "dispensingUnit",
        "component",
        "therapeuticClass",
        "prescriptionType",
        "storage",
        "inRename",
        "inFarmaciaPopular",
    ],
    properties: medicationProperties,
} as const;

const patchBody = {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: medicationProperties,
} as const;

export const medicationRoutes: FastifyPluginAsync = async (app) => {
    app.addHook("preHandler", requireAuth);

    app.get<{ Querystring: { search: string } }>(
        "/medications",
        {
            schema: {
                querystring: {
                    type: "object",
                    required: ["search"],
                    properties: { search: { type: "string", minLength: 2, maxLength: 80 } },
                },
            },
        },
        async (request) => ({ items: await searchMedications(app.db, request.query.search) }),
    );

    app.get<{ Params: { id: string } }>(
        "/medications/:id",
        { schema: { params: idParams } },
        async (request) => ({
            medication: await getMedication(app.db, request.params.id),
        }),
    );

    app.get<{ Params: { id: string } }>(
        "/medications/:id/availability",
        { schema: { params: idParams }, preHandler: requireRole("patient") },
        async (request) => medicationAvailability(app.db, request.user.id, request.params.id),
    );

    app.post<{ Body: MedicationInput }>(
        "/medications",
        { schema: { body: createBody }, preHandler: requireRole("pharmacy_staff", "manager") },
        async (request, reply) =>
            reply.code(201).send({ medication: await createMedication(app.db, request.body) }),
    );

    app.patch<{ Params: { id: string }; Body: Partial<MedicationInput> }>(
        "/medications/:id",
        {
            schema: { params: idParams, body: patchBody },
            preHandler: requireRole("pharmacy_staff", "manager"),
        },
        async (request) => ({
            medication: await updateMedication(app.db, request.params.id, request.body),
        }),
    );
};
