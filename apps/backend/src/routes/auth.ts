import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import { requireAuth } from "../auth/guards.js";
import { verifyPassword } from "../auth/password.js";
import { clearSessionCookie, setSessionCookie } from "../auth/session.js";
import { UnauthorizedError } from "../domain/errors.js";
import { registerPatient } from "../services/accounts.js";
import type { RegisterPatientInput, SessionUser } from "../contracts.js";

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

export const registerSchema = {
    type: "object",
    required: [
        "email",
        "password",
        "fullName",
        "birthDate",
        "cns",
        "phone",
        "address",
        "referencePharmacyId",
        "mobilityLimited",
    ],
    additionalProperties: false,
    properties: {
        email: { type: "string", format: "email", maxLength: 160 },
        password: { type: "string", minLength: 8, maxLength: 128 },
        fullName: { type: "string", minLength: 3, maxLength: 160 },
        socialName: { type: "string", minLength: 1, maxLength: 160 },
        birthDate: { type: "string", format: "date" },
        cns: { type: "string", pattern: "^\\d{15}$" },
        cpf: { type: "string", pattern: "^\\d{11}$" },
        phone: { type: "string", pattern: "^\\d{10,11}$" },
        address: addressSchema,
        latitude: { type: "number", minimum: -90, maximum: 90 },
        longitude: { type: "number", minimum: -180, maximum: 180 },
        referencePharmacyId: { type: "string", format: "uuid" },
        mobilityLimited: { type: "boolean" },
        priority: {
            type: "object",
            required: ["category", "consent"],
            additionalProperties: false,
            properties: {
                category: { type: "string", enum: ["chronic", "oncology", "rare_disease"] },
                consent: { type: "boolean", const: true },
            },
        },
    },
} as const;

export const authRoutes: FastifyPluginAsync = async (app) => {
    app.post<{ Body: RegisterPatientInput }>(
        "/auth/register",
        { schema: { body: registerSchema } },
        async (request, reply) => {
            const { userId } = await registerPatient(app.db, request.body);
            const user: SessionUser = { id: userId, role: "patient" };
            await setSessionCookie(reply, user);
            return reply.code(201).send({ user });
        },
    );

    app.post<{ Body: { email: string; password: string } }>(
        "/auth/login",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["email", "password"],
                    additionalProperties: false,
                    properties: {
                        email: { type: "string", minLength: 3, maxLength: 160 },
                        password: { type: "string", minLength: 1, maxLength: 128 },
                    },
                },
            },
        },
        async (request, reply) => {
            const [row] = await app.db
                .select()
                .from(users)
                .where(eq(users.email, request.body.email.toLowerCase()));
            if (
                !row ||
                !row.active ||
                !(await verifyPassword(row.passwordHash, request.body.password))
            ) {
                throw new UnauthorizedError("E-mail ou senha incorretos.");
            }
            const user: SessionUser = { id: row.id, role: row.role };
            await setSessionCookie(reply, user);
            return { user };
        },
    );

    app.post("/auth/logout", async (_request, reply) => {
        clearSessionCookie(reply);
        return { ok: true };
    });

    app.get("/auth/me", { preHandler: requireAuth }, async (request) => ({ user: request.user }));
};
