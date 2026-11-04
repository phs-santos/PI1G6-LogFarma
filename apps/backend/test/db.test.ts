import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { testDb } from "./helpers.js";

describe("banco de teste", () => {
    it("conecta e aplica migrações", async () => {
        const r = await testDb.execute(sql`select 1 as ok`);
        expect(r.rows[0]).toEqual({ ok: 1 });
    });
});
