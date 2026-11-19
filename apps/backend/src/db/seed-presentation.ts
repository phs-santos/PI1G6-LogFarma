// Dados da apresentação em cima do catálogo, SEM apagar nada (diferente do seed.ts).
// Põe estoque em todas as unidades, cria uma conta por perfil e monta os cenários do fluxo
// (retirada, transferência, entrega, lista de espera e pedido ao fornecedor) pelas próprias
// funções de serviço, como se as telas tivessem sido usadas.
// Pré-requisito: o catálogo carregado (seed-catalog.js).
// Uso: PRESENTATION_PASSWORD=... node dist/db/seed-presentation.js   (dev: tsx src/db/seed-presentation.ts)
// Recusa rodar duas vezes: se já existir conta @demo.logfarma, para sem mexer em nada.
import { and, eq, like, sql } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import type { Db } from "./client.js";
import {
    medications,
    pharmacies,
    pharmacyStaff,
    purchaseOrders,
    searchEvents,
    stockBatches,
    stockItems,
    stockMovements,
    suppliers,
    users,
    caregivers,
} from "./schema.js";
import { addDays, isoDay } from "../domain/dates.js";
import { createAccount, registerPatient } from "../services/accounts.js";
import { checkPrescription, createRequest } from "../services/requests.js";
import { runCounterAction, type Staff } from "../services/counter.js";
import { runCourierAction, courierDeliveries } from "../services/deliveries.js";
// Registram as ações de balcão "request_transfer" e "order_from_supplier".
import "../services/transfers.js";
import "../services/purchasing-actions.js";

const DOMAIN = "@demo.logfarma";
const DAY = 24 * 60 * 60 * 1000;

/** Gerador pseudoaleatório fixo: rodar em bancos diferentes dá o mesmo estoque. */
function prng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Pharmacy = typeof pharmacies.$inferSelect;
type Medication = typeof medications.$inferSelect;

interface Plan {
    min: number;
    batches: { days: number; quantity: number }[];
}

const key = (ingredient: string, concentration: string) =>
    `${ingredient.toLowerCase()}|${concentration.toLowerCase()}`;

const LOSARTANA = key("Losartana potássica", "50 mg");
const METFORMINA = key("Cloridrato de metformina", "850 mg");
const DIPIRONA = key("Dipirona monoidratada", "500 mg");
const PARACETAMOL = key("Paracetamol", "500 mg");
const AMOXICILINA = key("Amoxicilina", "500 mg");
const INSULINA = key("Insulina humana NPH", "100 UI/mL");
const ADALIMUMABE = key("Adalimumabe", "40 mg");

/** Quais remédios cada tipo de unidade trabalha. */
function carries(p: Pharmacy, m: Medication): boolean {
    if (p.kind === "specialized_pharmacy") return m.component === "specialized";
    if (p.kind === "pfpb") return m.inFarmaciaPopular;
    if (p.kind === "municipal_pharmacy") return m.component !== "specialized";
    return m.component === "basic";
}

function randomPlan(rand: () => number, p: Pharmacy): Plan | null {
    const coverage = p.kind === "ubs" ? 0.7 : p.kind === "pfpb" ? 0.8 : 0.85;
    if (rand() > coverage) return null;
    const min = 10 * (2 + Math.floor(rand() * 7)); // 20 a 80
    const roll = rand();
    if (roll < 0.08) return { min, batches: [] }; // em falta
    if (roll < 0.2) {
        // abaixo do mínimo
        return {
            min,
            batches: [
                {
                    days: 60 + Math.floor(rand() * 200),
                    quantity: 1 + Math.floor(rand() * (min - 1)),
                },
            ],
        };
    }
    const batches = [
        { days: 90 + Math.floor(rand() * 500), quantity: min + 20 + Math.floor(rand() * 300) },
    ];
    if (rand() < 0.35) {
        // lote antigo, às vezes perto de vencer
        const days = rand() < 0.25 ? 10 + Math.floor(rand() * 20) : 40 + Math.floor(rand() * 80);
        batches.push({ days, quantity: 5 + Math.floor(rand() * 60) });
    }
    return { min, batches };
}

/** Estoque fixo da história da apresentação (sobrepõe o sorteio). */
function storyPlan(pharmacyName: string, med: string, p: Pharmacy): Plan | null | undefined {
    const city = (n: string) => pharmacyName === n;
    if (med === ADALIMUMABE) {
        return p.kind === "specialized_pharmacy" ? { min: 4, batches: [] } : null;
    }
    if (med === LOSARTANA) {
        if (city("UBS Centro")) return { min: 60, batches: [] };
        if (city("UBS Jardim São Sebastião"))
            return {
                min: 50,
                batches: [
                    { days: 45, quantity: 40 },
                    { days: 400, quantity: 120 },
                ],
            };
        if (city("UBS Vila Negri")) return { min: 30, batches: [{ days: 90, quantity: 25 }] };
    }
    if (med === METFORMINA && city("UBS Centro"))
        return { min: 100, batches: [{ days: 180, quantity: 200 }] };
    if (med === DIPIRONA && city("UBS Jardim São Sebastião"))
        return {
            min: 40,
            batches: [
                { days: 30, quantity: 80 },
                { days: 300, quantity: 150 },
            ],
        };
    if (med === PARACETAMOL && city("UBS Jardim São Sebastião"))
        return { min: 40, batches: [{ days: 250, quantity: 180 }] };
    if (med === AMOXICILINA && city("UBS Centro"))
        return { min: 30, batches: [{ days: 220, quantity: 60 }] };
    if (med === INSULINA && city("UBS Centro"))
        return { min: 10, batches: [{ days: 110, quantity: 8 }] };
    return undefined;
}

function batchNumber(m: Medication, days: number, today: string, i: number): string {
    const prefix = m.activeIngredient
        .normalize("NFD")
        .replace(/[^A-Za-z]/g, "")
        .slice(0, 3)
        .toUpperCase();
    const expiry = addDays(today, days);
    return `${prefix}-${expiry.slice(2, 4)}${expiry.slice(5, 7)}${"ABCDEF"[i]}`;
}

async function seedStock(db: Db, now: Date): Promise<{ items: number; batches: number }> {
    const today = isoDay(now);
    const units = await db.select().from(pharmacies);
    const meds = await db.select().from(medications);
    const existing = new Set(
        (await db.select().from(stockItems)).map((s) => `${s.pharmacyId}:${s.medicationId}`),
    );
    const rand = prng(2026);
    const itemRows: (typeof stockItems.$inferInsert)[] = [];
    const batchRows: (typeof stockBatches.$inferInsert)[] = [];
    for (const p of units) {
        for (const m of meds) {
            if (
                !carries(p, m) &&
                storyPlan(p.name, key(m.activeIngredient, m.concentration), p) === undefined
            )
                continue;
            const story = storyPlan(p.name, key(m.activeIngredient, m.concentration), p);
            const plan = story === undefined ? randomPlan(rand, p) : story;
            if (!plan || existing.has(`${p.id}:${m.id}`)) continue;
            itemRows.push({
                pharmacyId: p.id,
                medicationId: m.id,
                minQuantity: plan.min,
                updatedAt: new Date(now.getTime() - Math.floor(rand() * 2 * DAY)),
            });
            plan.batches.forEach((b, i) =>
                batchRows.push({
                    pharmacyId: p.id,
                    medicationId: m.id,
                    batchNumber: batchNumber(m, b.days, today, i),
                    expiryDate: addDays(today, b.days),
                    quantity: b.quantity,
                    manufacturerCnpj: "55666777000188",
                    receivedAt: new Date(now.getTime() - (5 + Math.floor(rand() * 60)) * DAY),
                }),
            );
        }
    }
    for (let i = 0; i < itemRows.length; i += 500)
        await db.insert(stockItems).values(itemRows.slice(i, i + 500));
    for (let i = 0; i < batchRows.length; i += 500) {
        const inserted = await db
            .insert(stockBatches)
            .values(batchRows.slice(i, i + 500))
            .returning();
        // Entrada registrada no histórico de movimentos, como uma compra recebida.
        await db.insert(stockMovements).values(
            inserted.map((b) => ({
                pharmacyId: b.pharmacyId,
                batchId: b.id,
                type: "entry_purchase" as const,
                quantity: b.quantity,
                createdAt: b.receivedAt,
            })),
        );
    }
    return { items: itemRows.length, batches: batchRows.length };
}

async function findPharmacy(db: Db, name: string): Promise<string> {
    const [p] = await db
        .select({ id: pharmacies.id })
        .from(pharmacies)
        .where(sql`lower(${pharmacies.name}) = lower(${name})`);
    if (!p) throw new Error(`Unidade "${name}" não encontrada: rode o seed-catalog antes.`);
    return p.id;
}

async function findMedication(
    db: Db,
    ingredient: string,
    concentration: string,
    form: Medication["pharmaceuticalForm"],
): Promise<Medication> {
    const [m] = await db
        .select()
        .from(medications)
        .where(
            and(
                sql`lower(${medications.activeIngredient}) = lower(${ingredient})`,
                sql`lower(${medications.concentration}) = lower(${concentration})`,
                eq(medications.pharmaceuticalForm, form),
            ),
        );
    if (!m) throw new Error(`Medicamento "${ingredient} ${concentration}" não encontrado.`);
    return m;
}

async function staffOf(db: Db, userId: string): Promise<Staff> {
    const [s] = await db.select().from(pharmacyStaff).where(eq(pharmacyStaff.userId, userId));
    return s!;
}

export async function seedPresentation(db: Db, now: Date, password: string) {
    const today = isoDay(now);
    const [already] = await db
        .select({ id: users.id })
        .from(users)
        .where(like(users.email, `%${DOMAIN}`))
        .limit(1);
    if (already) throw new Error(`Já existem contas ${DOMAIN}: a apresentação já foi carregada.`);

    const stock = await seedStock(db, now);

    const centro = await findPharmacy(db, "UBS Centro");
    const jardim = await findPharmacy(db, "UBS Jardim São Sebastião");
    const especializados = await findPharmacy(db, "Farmácia de Medicamentos Especializados");

    const supplierIds: string[] = [];
    for (const s of [
        { name: "Distribuidora Farma Paulista Ltda", cnpj: "33444555000166" },
        { name: "MedSul Distribuição de Medicamentos S.A.", cnpj: "44555666000177" },
    ]) {
        const [found] = await db.select().from(suppliers).where(eq(suppliers.cnpj, s.cnpj));
        const id = found?.id ?? (await db.insert(suppliers).values(s).returning())[0]!.id;
        supplierIds.push(id);
    }

    const address = {
        street: "Rua Sete de Setembro",
        number: "50",
        district: "Centro",
        city: "Taquaritinga",
        state: "SP",
        zip: "15900000",
    };
    const age = (years: number) => addDays(today, -Math.round(years * 365.25));

    const maria = (
        await registerPatient(db, {
            email: `maria${DOMAIN}`,
            password,
            fullName: "Maria Aparecida da Silva",
            birthDate: age(72.4),
            cns: "898009990000001",
            phone: "16999990001",
            address,
            latitude: -21.4065,
            longitude: -48.5045,
            referencePharmacyId: centro,
            mobilityLimited: true,
            priority: { category: "chronic", consent: true },
        })
    ).userId;
    const jose = (
        await registerPatient(db, {
            email: `jose${DOMAIN}`,
            password,
            fullName: "José Carlos Pereira",
            birthDate: age(58.2),
            cns: "898009990000002",
            phone: "16999990003",
            address: { ...address, street: "Rua XV de Novembro", number: "312" },
            referencePharmacyId: centro,
            mobilityLimited: false,
            priority: { category: "oncology", consent: true },
        })
    ).userId;
    const rafael = (
        await registerPatient(db, {
            email: `rafael${DOMAIN}`,
            password,
            fullName: "Rafael Souza Lima",
            birthDate: age(45.3),
            cns: "898009990000003",
            phone: "16999990004",
            address: {
                ...address,
                street: "Rua São Sebastião",
                number: "601",
                district: "Jd. São Sebastião",
            },
            referencePharmacyId: jardim,
            mobilityLimited: false,
        })
    ).userId;
    await db.insert(caregivers).values({
        patientId: maria,
        fullName: "Ana Paula da Silva",
        document: "12345678901",
        relationship: "filha",
        phone: "16999990002",
    });

    const staffAccount = async (
        email: string,
        fullName: string,
        pharmacyId: string,
        occupation: "pharmacist" | "pharmacy_assistant",
        crf?: string,
    ) =>
        staffOf(
            db,
            (
                await createAccount(db, {
                    role: "pharmacy_staff",
                    email: `${email}${DOMAIN}`,
                    password,
                    fullName,
                    pharmacyId,
                    occupation,
                    ...(crf ? { crfNumber: crf, crfState: "SP" } : {}),
                })
            ).userId,
        );
    const farmCentro = await staffAccount(
        "farmaceutico.centro",
        "Ana Beatriz Rocha",
        centro,
        "pharmacist",
        "45123",
    );
    const auxCentro = await staffAccount(
        "auxiliar.centro",
        "Bruno Martins",
        centro,
        "pharmacy_assistant",
    );
    const farmJardim = await staffAccount(
        "farmaceutico.jardim",
        "Camila Torres",
        jardim,
        "pharmacist",
        "45124",
    );
    const farmEsp = await staffAccount(
        "farmaceutico.especializados",
        "Daniel Oliveira",
        especializados,
        "pharmacist",
        "45125",
    );
    await createAccount(db, {
        role: "supplier_staff",
        email: `fornecedor${DOMAIN}`,
        password,
        fullName: "Fernanda Lopes",
        supplierId: supplierIds[0]!,
    });
    await createAccount(db, {
        role: "supplier_staff",
        email: `fornecedor2${DOMAIN}`,
        password,
        fullName: "Gustavo Reis",
        supplierId: supplierIds[1]!,
    });
    const courier = async (n: number, fullName: string) =>
        (
            await createAccount(db, {
                role: "courier",
                email: `entregador${n}${DOMAIN}`,
                password,
                fullName,
                phone: `1698888000${n}`,
                deliveryProgram: "Remédio em Casa — Taquaritinga",
            })
        ).userId;
    const entregador1 = await courier(1, "Carlos Mendes");
    const entregador2 = await courier(2, "Eduardo Ramos");
    await createAccount(db, {
        role: "manager",
        email: `gestor${DOMAIN}`,
        password,
        fullName: "Lúcia Fernandes",
    });

    const prescriber = {
        issuedAt: addDays(today, -10),
        prescriberName: "Dra. Helena Souza",
        prescriberCouncil: "CRM",
        prescriberNumber: "123456",
        prescriberState: "SP",
    };
    const losartana = await findMedication(db, "Losartana potássica", "50 mg", "tablet");
    const metformina = await findMedication(db, "Cloridrato de metformina", "850 mg", "tablet");
    const dipirona = await findMedication(db, "Dipirona monoidratada", "500 mg", "tablet");
    const paracetamol = await findMedication(db, "Paracetamol", "500 mg", "tablet");
    const amoxicilina = await findMedication(db, "Amoxicilina", "500 mg", "capsule");
    const adalimumabe = await findMedication(db, "Adalimumabe", "40 mg", "injectable");

    // 1. Já entregue: Rafael recebeu paracetamol em casa (histórico do entregador 2).
    {
        const r = await createRequest(db, rafael, {
            medicationId: paracetamol.id,
            quantity: 20,
            fulfillment: "delivery",
        });
        await runCounterAction(db, farmJardim, r.id, { action: "prepare" });
        await runCounterAction(db, farmJardim, r.id, {
            action: "schedule_delivery",
            scheduledWindow: "ontem, 8h–12h",
            courierId: entregador2,
        });
        const [d] = await courierDeliveries(db, entregador2, "mine");
        await runCourierAction(db, entregador2, d!.id, { action: "accept" });
        await runCourierAction(db, entregador2, d!.id, { action: "pick_up" });
        await runCourierAction(db, entregador2, d!.id, {
            action: "deliver",
            receivedBy: "Rafael Souza Lima",
        });
    }
    // 2. Já retirado: José pegou amoxicilina no balcão (receita conferida pela farmacêutica).
    {
        const r = await createRequest(db, jose, {
            medicationId: amoxicilina.id,
            quantity: 21,
            fulfillment: "pickup",
            prescription: { ...prescriber, issuedAt: addDays(today, -2), continuousUse: false },
        });
        await checkPrescription(db, farmCentro, r.prescription!.id);
        await runCounterAction(db, farmCentro, r.id, { action: "prepare" });
        await runCounterAction(db, farmCentro, r.id, { action: "dispense", pickedUpBy: "patient" });
    }
    // 3. Pronto para retirada: metformina da Maria separada na UBS Centro.
    {
        const r = await createRequest(db, maria, {
            medicationId: metformina.id,
            quantity: 60,
            fulfillment: "pickup",
            prescription: { ...prescriber, continuousUse: true },
        });
        await checkPrescription(db, auxCentro, r.prescription!.id);
        await runCounterAction(db, auxCentro, r.id, { action: "prepare" });
    }
    // 4. Em transferência: losartana em falta no Centro, pedida à UBS Jardim (falta enviar).
    {
        const r = await createRequest(db, maria, {
            medicationId: losartana.id,
            quantity: 30,
            fulfillment: "delivery",
            prescription: { ...prescriber, continuousUse: true },
        });
        await checkPrescription(db, farmCentro, r.prescription!.id);
        await runCounterAction(db, farmCentro, r.id, {
            action: "request_transfer",
            fromPharmacyId: jardim,
        });
    }
    // 5. Entrega agendada para o entregador 1: dipirona do Rafael.
    {
        const r = await createRequest(db, rafael, {
            medicationId: dipirona.id,
            quantity: 10,
            fulfillment: "delivery",
        });
        await runCounterAction(db, farmJardim, r.id, { action: "prepare" });
        await runCounterAction(db, farmJardim, r.id, {
            action: "schedule_delivery",
            scheduledWindow: "hoje, 14h–18h",
            courierId: entregador1,
        });
    }
    // 6. Lista de espera do adalimumabe (em falta em toda a rede) + pedido ao fornecedor aguardando.
    for (const patient of [rafael, jose]) {
        const r = await createRequest(db, patient, {
            medicationId: adalimumabe.id,
            quantity: 2,
            fulfillment: "pickup",
            prescription: { ...prescriber, continuousUse: true },
        });
        await checkPrescription(db, farmEsp, r.prescription!.id);
        await runCounterAction(db, farmEsp, r.id, {
            action: "order_from_supplier",
            supplierId: supplierIds[0]!,
        });
    }
    // 7. Reposição automática da losartana no Centro, já confirmada pelo fornecedor 2.
    await db.insert(purchaseOrders).values({
        pharmacyId: centro,
        medicationId: losartana.id,
        supplierId: supplierIds[1]!,
        quantity: 200,
        status: "confirmed",
        expectedAt: addDays(today, 5),
        origin: "auto_min_stock",
        createdAt: new Date(now.getTime() - 2 * DAY),
    });

    // Buscas dos últimos 30 dias (anônimas) para o painel do gestor.
    const units = await db
        .select({ id: pharmacies.id })
        .from(pharmacies)
        .where(sql`${pharmacies.kind} <> 'pfpb'`);
    const popular = await db
        .select({ id: medications.id })
        .from(medications)
        .where(eq(medications.component, "basic"))
        .limit(40);
    const rand = prng(1119);
    const searches: (typeof searchEvents.$inferInsert)[] = [];
    const pushSearch = (medicationId: string, found: boolean) =>
        searches.push({
            medicationId,
            pharmacyId: units[Math.floor(rand() * units.length)]!.id,
            foundInNetwork: found,
            createdAt: new Date(now.getTime() - Math.floor(rand() * 30 * DAY)),
        });
    for (let i = 0; i < 25; i++) pushSearch(adalimumabe.id, false);
    for (let i = 0; i < 18; i++) pushSearch(losartana.id, true);
    for (let i = 0; i < 12; i++) pushSearch(metformina.id, true);
    for (let i = 0; i < 160; i++)
        pushSearch(popular[Math.floor(rand() * popular.length)]!.id, rand() > 0.15);
    await db.insert(searchEvents).values(searches);

    return { ...stock, searches: searches.length };
}

// Uso direto pela linha de comando.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const password = process.env.PRESENTATION_PASSWORD ?? "";
    if (password.length < 8 || password === "demo1234") {
        console.error(
            "Defina PRESENTATION_PASSWORD (8+ caracteres, diferente da senha pública do repositório).",
        );
        process.exit(1);
    }
    const { env } = await import("../env.js");
    const { createDb } = await import("./client.js");
    const { runMigrations } = await import("./migrate.js");
    const { db, pool } = createDb(env.databaseUrl);
    await runMigrations(db);
    try {
        const r = await seedPresentation(db, new Date(), password);
        console.log(
            `Apresentação carregada: ${r.items} itens de estoque, ${r.batches} lotes, ${r.searches} buscas. Contas ${DOMAIN} criadas.`,
        );
    } catch (err) {
        console.error((err as Error).message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}
