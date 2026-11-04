import path from "node:path";
import { pathToFileURL } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Db } from "./client.js";

/** Aplica as migrações SQL da pasta drizzle/ (relativa ao diretório do backend). */
export async function runMigrations(db: Db): Promise<void> {
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
}

// Uso direto: pnpm db:migrate
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const { env } = await import("../env.js");
    const { createDb } = await import("./client.js");
    const { db, pool } = createDb(env.databaseUrl);
    await runMigrations(db);
    await pool.end();
    console.log("Migrações aplicadas.");
}
