import { sql } from "drizzle-orm";
import { afterAll } from "vitest";
import { createDb, type Db } from "../src/db/client.js";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { medications, pharmacies } from "../src/db/schema.js";
import { normalizeSearchName } from "./normalize.js";

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

export function buildTestApp(): FastifyInstance {
    return buildApp({ db: testDb });
}

type NewPharmacy = typeof pharmacies.$inferInsert;
type NewMedication = typeof medications.$inferInsert;

export async function createPharmacy(overrides: Partial<NewPharmacy> = {}) {
    const [row] = await testDb
        .insert(pharmacies)
        .values({
            name: "UBS Centro",
            kind: "ubs",
            network: "municipal",
            address: "Rua Prudente de Moraes, 100 — Centro, Taquaritinga/SP",
            latitude: -21.406,
            longitude: -48.505,
            phone: "1632520000",
            openingHours: "seg–sex 7h–17h",
            ...overrides,
        })
        .returning();
    return row!;
}

export async function createMedication(overrides: Partial<NewMedication> = {}) {
    const base = {
        activeIngredient: "Losartana potássica",
        concentration: "50 mg",
        pharmaceuticalForm: "tablet" as const,
        route: "oral" as const,
        dispensingUnit: "comprimido",
        component: "basic" as const,
        therapeuticClass: "anti-hipertensivo",
        prescriptionType: "simple" as const,
        storage: "room_temperature" as const,
        inRename: true,
        inFarmaciaPopular: true,
        ...overrides,
    };
    const [row] = await testDb
        .insert(medications)
        .values({
            ...base,
            searchName:
                overrides.searchName ??
                normalizeSearchName(base.activeIngredient, base.concentration),
        })
        .returning();
    return row!;
}

/** Faz login e devolve o cabeçalho Cookie para as próximas chamadas. */
export async function loginAs(
    app: FastifyInstance,
    email: string,
    password = "senha-forte-1",
): Promise<string> {
    const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email, password },
    });
    if (res.statusCode !== 200) {
        throw new Error(`login de ${email} falhou: ${res.statusCode} ${res.body}`);
    }
    const cookie = res.headers["set-cookie"];
    const raw = Array.isArray(cookie) ? cookie[0] : cookie;
    return (raw ?? "").split(";")[0]!;
}

export function patientPayload(
    referencePharmacyId: string,
    overrides: Record<string, unknown> = {},
) {
    return {
        email: "maria@example.com",
        password: "senha-forte-1",
        fullName: "Maria Aparecida da Silva",
        birthDate: "1954-03-10",
        cns: "898001234567890",
        phone: "16999990000",
        address: {
            street: "Rua Sete de Setembro",
            number: "50",
            district: "Centro",
            city: "Taquaritinga",
            state: "SP",
            zip: "15900000",
        },
        latitude: -21.4065,
        longitude: -48.5045,
        referencePharmacyId,
        mobilityLimited: true,
        ...overrides,
    };
}
