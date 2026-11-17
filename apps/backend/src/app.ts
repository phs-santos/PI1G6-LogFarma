import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import type { Db } from "./db/client.js";
import { env } from "./env.js";
import { AppError } from "./domain/errors.js";
import { sessionPlugin } from "./auth/session.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { notificationRoutes } from "./routes/notifications.js";
import { medicationRoutes } from "./routes/medications.js";
import { pharmacyListRoutes } from "./routes/pharmacies.js";
import { requestRoutes } from "./routes/requests.js";
import { pharmacyRoutes } from "./routes/pharmacy.js";
import { supplierRoutes } from "./routes/supplier.js";
import { courierRoutes } from "./routes/courier.js";
import { meRoutes } from "./routes/me.js";
import { managerRoutes } from "./routes/manager.js";
import { supplierListRoutes } from "./routes/suppliers.js";
import { createMailer, type Mailer } from "./services/mailer.js";

export interface AppDeps {
    db: Db;
    /** Carteiro de e-mail; os testes passam um falso. Padrão: SMTP do .env (ou só log). */
    mailer?: Mailer;
}

declare module "fastify" {
    interface FastifyInstance {
        db: Db;
        mailer: Mailer;
    }
}

/** A origem está liberada no CORS_ORIGIN ou é o próprio domínio que recebeu a chamada. */
export function isAllowedOrigin(origin: string, host: string | undefined): boolean {
    if (env.corsOrigins.includes(origin)) return true;
    try {
        return host !== undefined && new URL(origin).host === host;
    } catch {
        return false;
    }
}

export function buildApp(deps: AppDeps) {
    const app = Fastify({
        logger: env.nodeEnv === "test" ? false : { level: "info" },
        ajv: { customOptions: { removeAdditional: false, allErrors: false } },
    });

    app.decorate("db", deps.db);
    app.decorate("mailer", deps.mailer ?? createMailer(app.log));

    app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
        if (error instanceof AppError) {
            return reply.code(error.statusCode).send({ message: error.message });
        }
        if ("validation" in error && error.validation) {
            return reply.code(400).send({ message: `Dados inválidos: ${error.message}` });
        }
        const status =
            "statusCode" in error && error.statusCode && error.statusCode < 500
                ? error.statusCode
                : 500;
        if (status >= 500) {
            // Só o erro técnico; nada de corpo da requisição (LGPD).
            request.log.error({ err: error }, "erro inesperado");
            return reply.code(500).send({ message: "Erro interno. Tente de novo em instantes." });
        }
        return reply.code(status).send({ message: error.message });
    });

    // Só os sites do CORS_ORIGIN chamam a API pelo navegador. A própria tela, servida no mesmo
    // domínio (nginx ou proxy do Vite), passa sempre. Chamada sem Origin (curl, healthcheck)
    // não vem de site nenhum e segue; quem protege os dados é o login.
    app.addHook("onRequest", async (request, reply) => {
        const { origin } = request.headers;
        if (!origin || isAllowedOrigin(origin, request.headers.host)) return;
        return reply.code(403).send({ message: "Este site não tem permissão para usar a API." });
    });
    app.register(cors, { origin: env.corsOrigins, credentials: true });
    app.register(sessionPlugin);
    app.register(healthRoutes, { prefix: "/api" });
    app.register(authRoutes, { prefix: "/api" });
    app.register(notificationRoutes, { prefix: "/api" });
    app.register(medicationRoutes, { prefix: "/api" });
    app.register(pharmacyListRoutes, { prefix: "/api" });
    app.register(requestRoutes, { prefix: "/api" });
    app.register(pharmacyRoutes, { prefix: "/api" });
    app.register(supplierRoutes, { prefix: "/api" });
    app.register(courierRoutes, { prefix: "/api" });
    app.register(meRoutes, { prefix: "/api" });
    app.register(managerRoutes, { prefix: "/api" });
    app.register(supplierListRoutes, { prefix: "/api" });

    return app;
}
