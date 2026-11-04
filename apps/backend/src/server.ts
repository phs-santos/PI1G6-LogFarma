import { buildApp } from "./app.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { env } from "./env.js";

const { db } = createDb(env.databaseUrl);
const app = buildApp({ db });

try {
    // Banco sempre atualizado antes de aceitar requisições (também na VPS).
    await runMigrations(db);
    await app.listen({ port: env.port, host: env.host });
} catch (err) {
    app.log.error(err);
    process.exit(1);
}
