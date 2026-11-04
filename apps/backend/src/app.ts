import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { healthRoutes } from "./routes/health.js";

export function buildApp() {
    const app = Fastify({ logger: true });

    app.register(cors, { origin: env.corsOrigin });
    app.register(healthRoutes, { prefix: "/api" });

    return app;
}
