import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Db } from "./db/client.js";
import { env } from "./env.js";
import { healthRoutes } from "./routes/health.js";

export interface AppDeps {
    db: Db;
}

declare module "fastify" {
    interface FastifyInstance {
        db: Db;
    }
}

export function buildApp(deps: AppDeps) {
    const app = Fastify({ logger: env.nodeEnv !== "test" });

    app.decorate("db", deps.db);
    app.register(cors, { origin: env.corsOrigin, credentials: true });
    app.register(healthRoutes, { prefix: "/api" });

    return app;
}
