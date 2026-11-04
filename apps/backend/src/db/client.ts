import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Db ou transação: serviços aceitam os dois. */
export type DbOrTx = Db | Tx;

export function createDb(url: string): { db: Db; pool: pg.Pool } {
    const pool = new pg.Pool({ connectionString: url });
    const db = drizzle(pool, { schema, casing: "snake_case" });
    return { db, pool };
}
