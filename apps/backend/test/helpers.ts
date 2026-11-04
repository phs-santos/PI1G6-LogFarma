import { sql } from "drizzle-orm";
import { afterAll } from "vitest";
import { createDb, type Db } from "../src/db/client.js";

const { db, pool } = createDb(process.env.DATABASE_URL ?? "");
export const testDb: Db = db;

afterAll(async () => {
    await pool.end();
});

/** Esvazia todas as tabelas do esquema público (menos o controle de migrações). */
export async function resetDb(target: Db = testDb): Promise<void> {
    const result = await target.execute<{ tablename: string }>(
        sql`select tablename from pg_tables where schemaname = 'public'`,
    );
    const tables = result.rows.map((r) => `"${r.tablename}"`);
    if (tables.length > 0) {
        await target.execute(sql.raw(`truncate ${tables.join(", ")} restart identity cascade`));
    }
}
