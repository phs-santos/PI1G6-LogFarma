import pg from "pg";
import { createDb } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrate.js";
import { TEST_DATABASE_URL } from "../vitest.config.js";

// Cria o banco de teste (se faltar) e aplica as migrações uma vez por execução.
export default async function setup(): Promise<void> {
    const url = new URL(TEST_DATABASE_URL);
    const dbName = url.pathname.slice(1);
    const admin = new URL(TEST_DATABASE_URL);
    admin.pathname = "/postgres";
    const client = new pg.Client({ connectionString: admin.toString() });
    await client.connect();
    const exists = await client.query("select 1 from pg_database where datname = $1", [dbName]);
    if (exists.rowCount === 0) {
        await client.query(`create database "${dbName}"`);
    }
    await client.end();

    const { db, pool } = createDb(TEST_DATABASE_URL);
    await runMigrations(db);
    await pool.end();
}
