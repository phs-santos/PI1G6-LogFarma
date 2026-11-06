import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import { requireAuth } from "../auth/guards.js";
import { verifyPassword } from "../auth/password.js";
import { clearSessionCookie, setSessionCookie } from "../auth/session.js";
import { ForbiddenError, UnauthorizedError } from "../domain/errors.js";
import { getSessionProfile, registerPatient } from "../services/accounts.js";
import { requestPasswordReset, resetPassword } from "../services/password-reset.js";
import type {
    ForgotPasswordInput,
    LoginAudience,
    LoginInput,
    RegisterPatientInput,
    ResetPasswordInput,
    SessionUser,
} from "../contracts.js";

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

function audienceOf(role: SessionUser["role"]): LoginAudience {
    return role === "patient" ? "patient" : "team";
}

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

    app.post<{ Body: LoginInput }>(
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
                        audience: { type: "string", enum: ["patient", "team"] },
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
            // Aba errada na tela Entrar: paciente pela aba da equipe ou equipe pela aba do
            // paciente. Só avisa depois de conferir a senha, para não revelar quem tem conta.
            const { audience } = request.body;
            if (audience && audienceOf(row.role) !== audience) {
                throw new ForbiddenError(
                    audience === "patient"
                        ? 'Esta conta é da equipe. Toque em "Sou da equipe" para entrar.'
                        : 'Esta conta é de paciente. Toque em "Sou paciente" para entrar.',
                );
            }
            const user: SessionUser = { id: row.id, role: row.role };
            await setSessionCookie(reply, user);
            return { user, profile: await getSessionProfile(app.db, user) };
        },
    );

    // Recuperar senha: responde sempre igual, tenha o e-mail conta ou não (RNF03).
    app.post<{ Body: ForgotPasswordInput }>(
        "/auth/password/forgot",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["email"],
                    additionalProperties: false,
                    properties: { email: { type: "string", minLength: 3, maxLength: 160 } },
                },
            },
        },
        async (request) => {
            try {
                await requestPasswordReset(app.db, app.mailer, request.body.email);
            } catch (err) {
                // Falha no envio não pode revelar se a conta existe; fica só no log técnico.
                request.log.error({ err }, "falha ao enviar e-mail de recuperação");
            }
            return { ok: true };
        },
    );

    app.post<{ Body: ResetPasswordInput }>(
        "/auth/password/reset",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["token", "password"],
                    additionalProperties: false,
                    properties: {
                        token: { type: "string", minLength: 10, maxLength: 200 },
                        password: { type: "string", minLength: 8, maxLength: 128 },
                    },
                },
            },
        },
        async (request) => {
            await resetPassword(app.db, request.body.token, request.body.password);
            return { ok: true };
        },
    );

    app.post("/auth/logout", async (_request, reply) => {
        clearSessionCookie(reply);
        return { ok: true };
    });

    app.get("/auth/me", { preHandler: requireAuth }, async (request) => ({
        user: request.user,
        profile: await getSessionProfile(app.db, request.user),
    }));
};
