// Seed da demonstração "Dona Maria": zera o banco e recarrega Taquaritinga.
// Uso: pnpm db:seed (dev) · docker compose exec backend node dist/db/seed.js (produção, com ALLOW_DEMO_SEED=true)
import { sql } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import type { Db } from "./client.js";
import {
    caregivers,
    medicationRequests,
    pharmacies,
    prescriptions,
    purchaseOrders,
    searchEvents,
    stockBatches,
    stockItems,
    suppliers,
    waitlistEntries,
} from "./schema.js";
import {
    DEMO_BATCHES,
    DEMO_MEDICATIONS,
    DEMO_MIN,
    DEMO_PHARMACIES,
    DEMO_SUPPLIERS,
} from "./seed-data.js";
import { addDays, isoDay } from "../domain/dates.js";
import { computePriority } from "../domain/priority.js";
import { createAccount, registerPatient } from "../services/accounts.js";
import { createMedication } from "../services/medications.js";
import type { RegisterPatientInput } from "../contracts.js";

type PharmacyKey = keyof typeof DEMO_PHARMACIES;
type MedicationKey = keyof typeof DEMO_MEDICATIONS;

export interface DemoIds {
    pharmacies: Record<PharmacyKey, string>;
    medications: Record<MedicationKey, string>;
    suppliers: string[];
    users: {
        maria: string;
        oncologico: string;
        semPrioridade: string;
        farmaceuticoCentro: string;
        auxiliarCentro: string;
        farmaceuticoJardim: string;
        farmaceuticoEspecializados: string;
        fornecedor: string;
        entregador1: string;
        entregador2: string;
        gestor: string;
    };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function wipe(db: Db): Promise<void> {
    const result = await db.execute<{ tablename: string }>(
        sql`select tablename from pg_tables where schemaname = 'public'`,
    );
    const tables = result.rows.map((r) => `"${r.tablename}"`);
    if (tables.length > 0)
        await db.execute(sql.raw(`truncate ${tables.join(", ")} restart identity cascade`));
}

function patientInput(
    email: string,
    password: string,
    overrides: Partial<RegisterPatientInput> &
        Pick<RegisterPatientInput, "fullName" | "birthDate" | "cns" | "referencePharmacyId">,
): RegisterPatientInput {
    return {
        email,
        password,
        phone: "16999990000",
        address: {
            street: "Rua Sete de Setembro",
            number: "50",
            district: "Centro",
            city: "Taquaritinga",
            state: "SP",
            zip: "15900000",
        },
        mobilityLimited: false,
        ...overrides,
    };
}

export async function seedDemo(db: Db, now: Date, password: string): Promise<DemoIds> {
    await wipe(db);
    const today = isoDay(now);

    const pharmacyIds = {} as Record<PharmacyKey, string>;
    for (const [key, values] of Object.entries(DEMO_PHARMACIES) as [
        PharmacyKey,
        (typeof DEMO_PHARMACIES)[PharmacyKey],
    ][]) {
        const [row] = await db.insert(pharmacies).values(values).returning({ id: pharmacies.id });
        pharmacyIds[key] = row!.id;
    }

    const medicationIds = {} as Record<MedicationKey, string>;
    for (const [key, values] of Object.entries(DEMO_MEDICATIONS) as [
        MedicationKey,
        (typeof DEMO_MEDICATIONS)[MedicationKey],
    ][]) {
        medicationIds[key] = (await createMedication(db, values)).id;
    }

    // Resumo de estoque com "atualizado há X" variado (2 h, 1 dia...).
    const updatedAgo = [2 * HOUR, 5 * HOUR, DAY, 2 * HOUR, 30 * 60 * 1000];
    const pairs = new Map<
        string,
        { pharmacy: PharmacyKey; medication: MedicationKey; min: number }
    >();
    for (const [pharmacy, medication] of DEMO_BATCHES)
        pairs.set(`${pharmacy}:${medication}`, { pharmacy, medication, min: 0 });
    for (const [pharmacy, medication, min] of DEMO_MIN)
        pairs.set(`${pharmacy}:${medication}`, { pharmacy, medication, min });
    let n = 0;
    for (const p of pairs.values()) {
        await db.insert(stockItems).values({
            pharmacyId: pharmacyIds[p.pharmacy],
            medicationId: medicationIds[p.medication],
            minQuantity: p.min,
            updatedAt: new Date(now.getTime() - updatedAgo[n++ % updatedAgo.length]!),
        });
    }
    for (const [pharmacy, medication, batchNumber, days, quantity] of DEMO_BATCHES) {
        await db.insert(stockBatches).values({
            pharmacyId: pharmacyIds[pharmacy],
            medicationId: medicationIds[medication],
            batchNumber,
            expiryDate: addDays(today, days),
            quantity,
            manufacturerCnpj: "55666777000188",
        });
    }

    const supplierIds: string[] = [];
    for (const s of DEMO_SUPPLIERS) {
        const [row] = await db.insert(suppliers).values(s).returning({ id: suppliers.id });
        supplierIds.push(row!.id);
    }

    const staff = async (
        email: string,
        fullName: string,
        pharmacy: PharmacyKey,
        occupation: "pharmacist" | "pharmacy_assistant",
        crf?: string,
    ) =>
        (
            await createAccount(db, {
                role: "pharmacy_staff",
                email,
                password,
                fullName,
                pharmacyId: pharmacyIds[pharmacy],
                occupation,
                ...(crf ? { crfNumber: crf, crfState: "SP" } : {}),
            })
        ).userId;

    const users: DemoIds["users"] = {
        maria: (
            await registerPatient(
                db,
                patientInput("maria@demo.logfarma", password, {
                    fullName: "Maria Aparecida da Silva",
                    birthDate: addDays(today, -Math.round(72.4 * 365.25)),
                    cns: "898001234567890",
                    phone: "16999990001",
                    latitude: -21.4065,
                    longitude: -48.5045,
                    referencePharmacyId: pharmacyIds.centro,
                    mobilityLimited: true,
                    priority: { category: "chronic", consent: true },
                }),
            )
        ).userId,
        oncologico: (
            await registerPatient(
                db,
                patientInput("jose@demo.logfarma", password, {
                    fullName: "José Carlos Pereira",
                    birthDate: addDays(today, -Math.round(58.2 * 365.25)),
                    cns: "898001234567891",
                    referencePharmacyId: pharmacyIds.vilaNegri,
                    priority: { category: "oncology", consent: true },
                }),
            )
        ).userId,
        semPrioridade: (
            await registerPatient(
                db,
                patientInput("rafael@demo.logfarma", password, {
                    fullName: "Rafael Souza Lima",
                    birthDate: addDays(today, -Math.round(45.3 * 365.25)),
                    cns: "898001234567892",
                    referencePharmacyId: pharmacyIds.jardim,
                }),
            )
        ).userId,
        farmaceuticoCentro: await staff(
            "farmaceutico.centro@demo.logfarma",
            "Ana Beatriz Rocha",
            "centro",
            "pharmacist",
            "45123",
        ),
        auxiliarCentro: await staff(
            "auxiliar.centro@demo.logfarma",
            "Bruno Martins",
            "centro",
            "pharmacy_assistant",
        ),
        farmaceuticoJardim: await staff(
            "farmaceutico.jardim@demo.logfarma",
            "Camila Torres",
            "jardim",
            "pharmacist",
            "45124",
        ),
        farmaceuticoEspecializados: await staff(
            "farmaceutico.especializados@demo.logfarma",
            "Daniel Oliveira",
            "especializados",
            "pharmacist",
            "45125",
        ),
        fornecedor: (
            await createAccount(db, {
                role: "supplier_staff",
                email: "fornecedor@demo.logfarma",
                password,
                fullName: "Fernanda Lopes",
                supplierId: supplierIds[0]!,
            })
        ).userId,
        entregador1: (
            await createAccount(db, {
                role: "courier",
                email: "entregador1@demo.logfarma",
                password,
                fullName: "Carlos Mendes",
                phone: "16988880001",
                deliveryProgram: "Remédio em Casa — Taquaritinga",
            })
        ).userId,
        entregador2: (
            await createAccount(db, {
                role: "courier",
                email: "entregador2@demo.logfarma",
                password,
                fullName: "Eduardo Ramos",
                phone: "16988880002",
                deliveryProgram: "Remédio em Casa — Taquaritinga",
            })
        ).userId,
        gestor: (
            await createAccount(db, {
                role: "manager",
                email: "gestor@demo.logfarma",
                password,
                fullName: "Lúcia Fernandes",
            })
        ).userId,
    };
    await createAccount(db, {
        role: "supplier_staff",
        email: "fornecedor2@demo.logfarma",
        password,
        fullName: "Gustavo Reis",
        supplierId: supplierIds[1]!,
    });

    await db.insert(caregivers).values({
        patientId: users.maria,
        fullName: "Ana Paula da Silva",
        document: "12345678901",
        relationship: "filha",
        phone: "16999990002",
    });

    // Receitas válidas da Maria (losartana de uso contínuo e adalimumabe).
    const prescriber = {
        prescriberName: "Dra. Helena Souza",
        prescriberCouncil: "CRM",
        prescriberNumber: "123456",
        prescriberState: "SP",
    };
    await db.insert(prescriptions).values([
        {
            patientId: users.maria,
            medicationId: medicationIds.losartana,
            type: "simple",
            issuedAt: addDays(today, -20),
            validUntil: addDays(today, 160),
            continuousUse: true,
            ...prescriber,
        },
        {
            patientId: users.maria,
            medicationId: medicationIds.adalimumabe,
            type: "simple",
            issuedAt: addDays(today, -10),
            validUntil: addDays(today, 170),
            continuousUse: true,
            ...prescriber,
        },
    ]);

    // Fila do adalimumabe antes da Maria: o de 45 anos entrou primeiro; o oncológico depois.
    const [po] = await db
        .insert(purchaseOrders)
        .values({
            pharmacyId: pharmacyIds.especializados,
            medicationId: medicationIds.adalimumabe,
            supplierId: supplierIds[0]!,
            quantity: 2,
            origin: "manual",
            createdAt: new Date(now.getTime() - 5 * DAY),
        })
        .returning({ id: purchaseOrders.id });
    const queue = [
        {
            patientId: users.semPrioridade,
            ago: 5 * DAY,
            category: null,
            birth: addDays(today, -Math.round(45.3 * 365.25)),
        },
        {
            patientId: users.oncologico,
            ago: 3 * DAY,
            category: "oncology" as const,
            birth: addDays(today, -Math.round(58.2 * 365.25)),
        },
    ];
    for (const q of queue) {
        const at = new Date(now.getTime() - q.ago);
        const [req] = await db
            .insert(medicationRequests)
            .values({
                patientId: q.patientId,
                medicationId: medicationIds.adalimumabe,
                quantity: 1,
                pharmacyId: pharmacyIds.especializados,
                fulfillment: "pickup",
                status: "waitlisted",
                createdAt: at,
                updatedAt: at,
            })
            .returning({ id: medicationRequests.id });
        await db.insert(waitlistEntries).values({
            requestId: req!.id,
            patientId: q.patientId,
            medicationId: medicationIds.adalimumabe,
            pharmacyId: pharmacyIds.especializados,
            purchaseOrderId: po!.id,
            priority: computePriority({ category: q.category, birthDate: q.birth }, now),
            createdAt: at,
        });
    }

    // Buscas da última semana para o painel do gestor.
    const searches: [MedicationKey, PharmacyKey, boolean, number][] = [
        ["adalimumabe", "centro", false, 8],
        ["adalimumabe", "vilaNegri", false, 3],
        ["clonazepam", "jardim", false, 4],
        ["losartana", "centro", true, 6],
        ["insulina", "vilaNegri", false, 2],
    ];
    for (const [medication, pharmacy, found, count] of searches) {
        for (let i = 0; i < count; i++) {
            await db.insert(searchEvents).values({
                medicationId: medicationIds[medication],
                pharmacyId: pharmacyIds[pharmacy],
                foundInNetwork: found,
                createdAt: new Date(now.getTime() - ((i % 6) + 1) * DAY + i * HOUR),
            });
        }
    }

    return { pharmacies: pharmacyIds, medications: medicationIds, suppliers: supplierIds, users };
}

/** Em produção o seed apaga dados reais: exige liberação explícita e uma senha de demonstração própria. */
export function assertSeedAllowed(env: {
    nodeEnv: string;
    allowDemoSeed: boolean;
    demoPassword: string;
}): void {
    if (env.nodeEnv !== "production") return;
    if (!env.allowDemoSeed) {
        throw new Error(
            "Seed recusado: em produção ele apaga todos os dados. Defina ALLOW_DEMO_SEED=true para confirmar.",
        );
    }
    if (!env.demoPassword || env.demoPassword === "demo1234") {
        throw new Error(
            "Seed recusado: defina uma DEMO_PASSWORD própria (a padrão é pública no repositório).",
        );
    }
}

// Uso direto pela linha de comando.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const { env } = await import("../env.js");
    try {
        assertSeedAllowed(env);
    } catch (err) {
        console.error((err as Error).message);
        process.exit(1);
    }
    const { createDb } = await import("./client.js");
    const { runMigrations } = await import("./migrate.js");
    const { db, pool } = createDb(env.databaseUrl);
    await runMigrations(db);
    await seedDemo(db, new Date(), env.demoPassword);
    await pool.end();
    console.log(
        [
            "Dados da demonstração carregados. Contas (senha = DEMO_PASSWORD):",
            "  paciente:      maria@demo.logfarma",
            "  farmácia:      farmaceutico.centro@demo.logfarma · auxiliar.centro@demo.logfarma",
            "                 farmaceutico.jardim@demo.logfarma · farmaceutico.especializados@demo.logfarma",
            "  fornecedor:    fornecedor@demo.logfarma",
            "  entregadores:  entregador1@demo.logfarma · entregador2@demo.logfarma",
            "  gestor:        gestor@demo.logfarma",
        ].join("\n"),
    );
}
