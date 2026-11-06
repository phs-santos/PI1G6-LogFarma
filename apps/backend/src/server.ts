import { buildApp } from "./app.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { env } from "./env.js";
import { ensureFirstManager } from "./services/bootstrap-admin.js";

const { db } = createDb(env.databaseUrl);
const app = buildApp({ db });

try {
    // Banco sempre atualizado antes de aceitar requisições (também na VPS).
    await runMigrations(db);
    // Primeiro gestor (ADMIN_EMAIL/ADMIN_PASSWORD). Falha aqui não derruba a API (RNF02).
    try {
        const admin = await ensureFirstManager(db, { nodeEnv: env.nodeEnv, ...env.admin });
        if (admin.status === "created") app.log.info("primeiro gestor criado (ADMIN_EMAIL)");
        if (admin.status === "exists" && env.admin.email) {
            app.log.info("ADMIN_EMAIL ignorado: já existe um gestor (pode tirar do .env)");
        }
        if (admin.status === "refused") app.log.error(`gestor não criado: ${admin.reason}`);
    } catch (err) {
        app.log.error({ err }, "falha ao criar o primeiro gestor");
    }
    await app.listen({ port: env.port, host: env.host });
} catch (err) {
    app.log.error(err);
    process.exit(1);
}
