import { sql } from "drizzle-orm";
import { afterAll } from "vitest";
import { createDb, type Db } from "../src/db/client.js";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import {
    medicationRequests,
    medications,
    pharmacies,
    stockBatches,
    stockItems,
    suppliers,
} from "../src/db/schema.js";
import { createAccount, registerPatient } from "../src/services/accounts.js";
import type { RegisterPatientInput } from "../src/contracts.js";
import { normalizeSearch } from "../src/domain/text.js";

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
                normalizeSearch(`${base.activeIngredient} ${base.concentration}`),
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

// ---------- factories de pessoas e pedidos ----------

let patientSeq = 0;

/** Cria paciente direto pelo serviço. Devolve o id do usuário (= id do paciente). */
export async function createPatient(
    referencePharmacyId: string,
    overrides: Record<string, unknown> = {},
): Promise<{ id: string; email: string }> {
    patientSeq += 1;
    const email = (overrides.email as string | undefined) ?? `paciente${patientSeq}@example.com`;
    const payload = patientPayload(referencePharmacyId, {
        email,
        cns: String(898000000000000 + patientSeq),
        ...overrides,
    });
    const { userId } = await registerPatient(testDb, payload as unknown as RegisterPatientInput);
    return { id: userId, email };
}

export async function createStaff(
    pharmacyId: string,
    occupation: "pharmacist" | "pharmacy_assistant" = "pharmacist",
    email = `staff-${pharmacyId.slice(0, 6)}-${occupation}@example.com`,
): Promise<{ id: string; email: string }> {
    const { userId } = await createAccount(testDb, {
        role: "pharmacy_staff",
        email,
        password: "senha-forte-1",
        fullName: occupation === "pharmacist" ? "Farmacêutica Ana" : "Auxiliar Bruno",
        pharmacyId,
        occupation,
        ...(occupation === "pharmacist" ? { crfNumber: "12345", crfState: "SP" } : {}),
    });
    return { id: userId, email };
}

export async function createSupplier(name = "Distribuidora Saúde Ltda") {
    const [row] = await testDb
        .insert(suppliers)
        .values({ name, cnpj: "12345678000190" })
        .returning();
    return row!;
}

export async function createRequestRow(values: {
    patientId: string;
    medicationId: string;
    pharmacyId: string;
    quantity?: number;
    fulfillment?: "pickup" | "delivery";
    status?: (typeof medicationRequests.$inferInsert)["status"];
}) {
    const [row] = await testDb
        .insert(medicationRequests)
        .values({ quantity: 1, fulfillment: "pickup", ...values })
        .returning();
    return row!;
}

export async function createBatch(values: {
    pharmacyId: string;
    medicationId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    minQuantity?: number;
}) {
    const { minQuantity, ...batch } = values;
    await testDb
        .insert(stockItems)
        .values({
            pharmacyId: batch.pharmacyId,
            medicationId: batch.medicationId,
            minQuantity: minQuantity ?? 0,
        })
        .onConflictDoNothing();
    const [row] = await testDb.insert(stockBatches).values(batch).returning();
    return row!;
}

export const prescriptionPayload = {
    issuedAt: "2026-11-01",
    prescriberName: "Dra. Helena Souza",
    prescriberCouncil: "CRM",
    prescriberNumber: "123456",
    prescriberState: "SP",
    continuousUse: true,
};

export async function createSpecializedPharmacy() {
    return createPharmacy({
        name: "Farmácia de Medicamentos Especializados",
        kind: "specialized_pharmacy",
        network: "state",
        latitude: -21.41,
        longitude: -48.51,
    });
}
