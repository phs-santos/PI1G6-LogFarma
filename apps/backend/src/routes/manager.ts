import type { FastifyPluginAsync } from "fastify";
import { requireAuth, requireRole } from "../auth/guards.js";
import { createAccount } from "../services/accounts.js";
import { expiringStock, managerSummary, unmetDemand } from "../services/reports.js";
import {
    createPharmacy,
    listMedicationsPage,
    listStaffAccounts,
    setStaffActive,
} from "../services/admin.js";
import type { CreateAccountInput, PharmacyInput, StaffRole } from "../contracts.js";

const DAY = 24 * 60 * 60 * 1000;

// Gestor: cria contas da equipe e vê os painéis (sem dado de paciente).
export const managerRoutes: FastifyPluginAsync = async (app) => {
    app.addHook("preHandler", requireAuth);
    app.addHook("preHandler", requireRole("manager"));

    app.post<{ Body: CreateAccountInput }>(
        "/manager/users",
        {
            schema: {
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["role", "email", "password", "fullName"],
                    properties: {
                        role: {
                            type: "string",
                            enum: ["pharmacy_staff", "supplier_staff", "courier", "manager"],
                        },
                        email: { type: "string", format: "email", maxLength: 160 },
                        password: { type: "string", minLength: 8, maxLength: 128 },
                        fullName: { type: "string", minLength: 3, maxLength: 160 },
                        pharmacyId: { type: "string", format: "uuid" },
                        occupation: { type: "string", enum: ["pharmacist", "pharmacy_assistant"] },
                        crfNumber: { type: "string", minLength: 1, maxLength: 20 },
                        crfState: { type: "string", pattern: "^[A-Z]{2}$" },
                        supplierId: { type: "string", format: "uuid" },
                        phone: { type: "string", pattern: "^\\d{10,11}$" },
                        deliveryProgram: { type: "string", minLength: 3, maxLength: 120 },
                    },
                },
            },
        },
        async (request, reply) => {
            const { userId } = await createAccount(app.db, request.body);
            return reply.code(201).send({ user: { id: userId, role: request.body.role } });
        },
    );

    app.get<{
        Querystring: {
            search?: string;
            page?: number;
            component?: "basic" | "strategic" | "specialized";
        };
    }>(
        "/manager/medications",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        search: { type: "string", maxLength: 80 },
                        page: { type: "integer", minimum: 1, maximum: 1000 },
                        component: {
                            type: "string",
                            enum: ["basic", "strategic", "specialized"],
                        },
                    },
                },
            },
        },
        async (request) => listMedicationsPage(app.db, request.query),
    );

    app.get<{ Querystring: { role?: StaffRole } }>(
        "/manager/users",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        role: {
                            type: "string",
                            enum: ["pharmacy_staff", "supplier_staff", "courier", "manager"],
                        },
                    },
                },
            },
        },
        async (request) => ({ items: await listStaffAccounts(app.db, request.query.role) }),
    );

    app.patch<{ Params: { id: string }; Body: { active: boolean } }>(
        "/manager/users/:id",
        {
            schema: {
                params: {
                    type: "object",
                    required: ["id"],
                    properties: { id: { type: "string", format: "uuid" } },
                },
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["active"],
                    properties: { active: { type: "boolean" } },
                },
            },
        },
        async (request) => {
            await setStaffActive(app.db, request.user.id, request.params.id, request.body.active);
            return { ok: true };
        },
    );

    app.post<{ Body: PharmacyInput }>(
        "/manager/pharmacies",
        {
            schema: {
                body: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "kind", "network", "address", "phone", "openingHours"],
                    properties: {
                        name: { type: "string", minLength: 3, maxLength: 160 },
                        kind: {
                            type: "string",
                            enum: ["ubs", "municipal_pharmacy", "specialized_pharmacy", "pfpb"],
                        },
                        network: { type: "string", enum: ["municipal", "state", "pfpb"] },
                        address: { type: "string", minLength: 5, maxLength: 240 },
                        phone: { type: "string", pattern: "^\\d{10,11}$" },
                        openingHours: { type: "string", minLength: 3, maxLength: 120 },
                        cnes: { type: "string", pattern: "^\\d{7}$" },
                        cnpj: { type: "string", pattern: "^\\d{14}$" },
                        latitude: { type: "number", minimum: -90, maximum: 90 },
                        longitude: { type: "number", minimum: -180, maximum: 180 },
                    },
                },
            },
        },
        async (request, reply) => {
            const { id } = await createPharmacy(app.db, request.body);
            return reply.code(201).send({ pharmacy: { id } });
        },
    );

    app.get("/manager/summary", async () => managerSummary(app.db));

    app.get<{ Querystring: { from?: string; to?: string } }>(
        "/manager/unmet-demand",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        from: { type: "string", format: "date" },
                        to: { type: "string", format: "date" },
                    },
                },
            },
        },
        async (request) => {
            const to = request.query.to
                ? new Date(`${request.query.to}T23:59:59-03:00`)
                : new Date();
            const from = request.query.from
                ? new Date(`${request.query.from}T00:00:00-03:00`)
                : new Date(to.getTime() - 7 * DAY);
            return { items: await unmetDemand(app.db, from, to) };
        },
    );

    app.get<{ Querystring: { days?: number } }>(
        "/manager/expiring-stock",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: { days: { type: "integer", minimum: 1, maximum: 365 } },
                },
            },
        },
        async (request) => ({ items: await expiringStock(app.db, request.query.days ?? 60) }),
    );
};
