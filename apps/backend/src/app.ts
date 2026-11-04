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

export interface AppDeps {
    db: Db;
}

declare module "fastify" {
    interface FastifyInstance {
        db: Db;
    }
}

export function buildApp(deps: AppDeps) {
    const app = Fastify({
        logger: env.nodeEnv === "test" ? false : { level: "info" },
        ajv: { customOptions: { removeAdditional: false, allErrors: false } },
    });

    app.decorate("db", deps.db);

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

    app.register(cors, { origin: env.corsOrigin, credentials: true });
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

    return app;
}
