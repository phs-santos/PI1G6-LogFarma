// Esquema do banco (Drizzle). Nomes seguem o glossário do CLAUDE.md e o design
// docs/2026-11-03-backend-design.md. Colunas viram snake_case (casing do client).
import { sql } from "drizzle-orm";
import {
    boolean,
    check,
    date,
    doublePrecision,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid().primaryKey().defaultRandom();
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

// ---------- enums ----------

export const userRole = pgEnum("user_role", [
    "patient",
    "pharmacy_staff",
    "supplier_staff",
    "courier",
    "manager",
]);
export const priorityCategory = pgEnum("priority_category", [
    "chronic",
    "oncology",
    "rare_disease",
]);
export const staffOccupation = pgEnum("staff_occupation", ["pharmacist", "pharmacy_assistant"]);
export const pharmacyKind = pgEnum("pharmacy_kind", [
    "ubs",
    "municipal_pharmacy",
    "specialized_pharmacy",
    "pfpb",
]);
export const pharmacyNetwork = pgEnum("pharmacy_network", ["municipal", "state", "pfpb"]);
export const pharmaceuticalForm = pgEnum("pharmaceutical_form", [
    "tablet",
    "capsule",
    "oral_solution",
    "oral_suspension",
    "injectable",
    "cream",
    "inhaler",
    "other",
]);
export const administrationRoute = pgEnum("administration_route", [
    "oral",
    "subcutaneous",
    "intramuscular",
    "intravenous",
    "topical",
    "inhalation",
    "other",
]);
export const medicationComponent = pgEnum("medication_component", [
    "basic",
    "strategic",
    "specialized",
]);
export const prescriptionType = pgEnum("prescription_type", [
    "none",
    "simple",
    "antimicrobial",
    "special_control",
]);
export const storageCondition = pgEnum("storage_condition", ["room_temperature", "refrigerated"]);
export const movementType = pgEnum("movement_type", [
    "entry_purchase",
    "entry_transfer",
    "exit_dispensation",
    "exit_transfer",
    "exit_loss",
    "adjustment",
]);
export const requestStatus = pgEnum("request_status", [
    "requested",
    "ready_for_pickup",
    "in_transfer",
    "waitlisted",
    "arrived",
    "delivery_scheduled",
    "out_for_delivery",
    "picked_up",
    "delivered",
    "cancelled",
]);
export const fulfillment = pgEnum("fulfillment", ["pickup", "delivery"]);
export const transferStatus = pgEnum("transfer_status", [
    "requested",
    "shipped",
    "received",
    "refused",
]);
export const purchaseStatus = pgEnum("purchase_status", [
    "placed",
    "confirmed",
    "no_date",
    "shipped",
    "received",
]);
export const purchaseOrigin = pgEnum("purchase_origin", ["manual", "auto_min_stock"]);
export const waitlistStatus = pgEnum("waitlist_status", ["waiting", "served", "cancelled"]);
export const pickedUpBy = pgEnum("picked_up_by", ["patient", "caregiver", "delivery"]);
export const deliveryStatus = pgEnum("delivery_status", [
    "scheduled",
    "out_for_delivery",
    "delivered",
    "failed",
]);

// ---------- rede ----------

export const pharmacies = pgTable("pharmacies", {
    id: id(),
    cnes: text(),
    cnpj: text(),
    name: text().notNull(),
    kind: pharmacyKind().notNull(),
    network: pharmacyNetwork().notNull(),
    address: text().notNull(),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    phone: text().notNull(),
    openingHours: text().notNull(),
    createdAt: createdAt(),
});

export const suppliers = pgTable("suppliers", {
    id: id(),
    name: text().notNull(),
    cnpj: text().notNull(),
    createdAt: createdAt(),
});

// ---------- pessoas e acesso ----------

export const users = pgTable("users", {
    id: id(),
    role: userRole().notNull(),
    email: text().notNull().unique(),
    passwordHash: text().notNull(),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
});

// Recuperar senha: guarda só o hash do código do link; vale 30 min e uma vez só.
export const passwordResetTokens = pgTable("password_reset_tokens", {
    id: id(),
    userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
});

export interface Address {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    zip: string;
}

export const patients = pgTable("patients", {
    userId: uuid()
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    fullName: text().notNull(),
    socialName: text(),
    birthDate: date().notNull(),
    cns: text().notNull().unique(),
    cpf: text().unique(),
    phone: text().notNull(),
    address: jsonb().$type<Address>().notNull(),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    referencePharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    mobilityLimited: boolean().notNull().default(false),
    notificationsConsentAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
});

export const patientPriorities = pgTable("patient_priorities", {
    id: id(),
    patientId: uuid()
        .notNull()
        .references(() => patients.userId, { onDelete: "cascade" }),
    category: priorityCategory().notNull(),
    declaredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    consentAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
});

export const caregivers = pgTable("caregivers", {
    id: id(),
    patientId: uuid()
        .notNull()
        .references(() => patients.userId, { onDelete: "cascade" }),
    fullName: text().notNull(),
    document: text().notNull(),
    relationship: text().notNull(),
    phone: text().notNull(),
    createdAt: createdAt(),
});

export const pharmacyStaff = pgTable("pharmacy_staff", {
    userId: uuid()
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    fullName: text().notNull(),
    pharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    occupation: staffOccupation().notNull(),
    crfNumber: text(),
    crfState: text(),
});

export const supplierStaff = pgTable("supplier_staff", {
    userId: uuid()
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    fullName: text().notNull(),
    supplierId: uuid()
        .notNull()
        .references(() => suppliers.id),
});

export const couriers = pgTable("couriers", {
    userId: uuid()
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    fullName: text().notNull(),
    phone: text().notNull(),
    deliveryProgram: text().notNull(),
});

// ---------- medicamentos e estoque ----------

export const medications = pgTable("medications", {
    id: id(),
    activeIngredient: text().notNull(),
    concentration: text().notNull(),
    pharmaceuticalForm: pharmaceuticalForm().notNull(),
    route: administrationRoute().notNull(),
    dispensingUnit: text().notNull(),
    component: medicationComponent().notNull(),
    therapeuticClass: text().notNull(),
    prescriptionType: prescriptionType().notNull(),
    storage: storageCondition().notNull(),
    inRename: boolean().notNull().default(true),
    inFarmaciaPopular: boolean().notNull().default(false),
    catmatCode: text(),
    // Texto normalizado (minúsculo, sem acento) para a busca.
    searchName: text().notNull(),
    createdAt: createdAt(),
});

export const stockItems = pgTable(
    "stock_items",
    {
        id: id(),
        pharmacyId: uuid()
            .notNull()
            .references(() => pharmacies.id),
        medicationId: uuid()
            .notNull()
            .references(() => medications.id),
        minQuantity: integer().notNull().default(0),
        updatedAt: updatedAt(),
    },
    (t) => [uniqueIndex("stock_items_pharmacy_medication").on(t.pharmacyId, t.medicationId)],
);

export const stockBatches = pgTable(
    "stock_batches",
    {
        id: id(),
        pharmacyId: uuid()
            .notNull()
            .references(() => pharmacies.id),
        medicationId: uuid()
            .notNull()
            .references(() => medications.id),
        batchNumber: text().notNull(),
        expiryDate: date().notNull(),
        quantity: integer().notNull(),
        manufacturerCnpj: text(),
        anvisaRegistration: text(),
        receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        check("stock_batches_quantity_non_negative", sql`${t.quantity} >= 0`),
        uniqueIndex("stock_batches_pharmacy_medication_batch").on(
            t.pharmacyId,
            t.medicationId,
            t.batchNumber,
        ),
    ],
);

// ---------- atendimento ----------

export const prescriptions = pgTable("prescriptions", {
    id: id(),
    patientId: uuid()
        .notNull()
        .references(() => patients.userId),
    medicationId: uuid()
        .notNull()
        .references(() => medications.id),
    type: prescriptionType().notNull(),
    issuedAt: date().notNull(),
    validUntil: date().notNull(),
    prescriberName: text().notNull(),
    prescriberCouncil: text().notNull(),
    prescriberNumber: text().notNull(),
    prescriberState: text().notNull(),
    continuousUse: boolean().notNull().default(false),
    checkedByStaffId: uuid().references(() => users.id),
    checkedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
});

export const medicationRequests = pgTable("medication_requests", {
    id: id(),
    patientId: uuid()
        .notNull()
        .references(() => patients.userId),
    medicationId: uuid()
        .notNull()
        .references(() => medications.id),
    quantity: integer().notNull(),
    prescriptionId: uuid().references(() => prescriptions.id),
    pharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    fulfillment: fulfillment().notNull(),
    status: requestStatus().notNull().default("requested"),
    sourcePharmacyId: uuid().references(() => pharmacies.id),
    expectedAt: date(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
});

export const stockReservations = pgTable("stock_reservations", {
    id: id(),
    batchId: uuid()
        .notNull()
        .references(() => stockBatches.id),
    requestId: uuid()
        .notNull()
        .references(() => medicationRequests.id),
    quantity: integer().notNull(),
    createdAt: createdAt(),
});

export const stockMovements = pgTable("stock_movements", {
    id: id(),
    pharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    batchId: uuid()
        .notNull()
        .references(() => stockBatches.id),
    type: movementType().notNull(),
    quantity: integer().notNull(),
    relatedId: uuid(),
    staffUserId: uuid().references(() => users.id),
    createdAt: createdAt(),
});

export const transfers = pgTable("transfers", {
    id: id(),
    requestId: uuid().references(() => medicationRequests.id),
    medicationId: uuid()
        .notNull()
        .references(() => medications.id),
    batchId: uuid()
        .notNull()
        .references(() => stockBatches.id),
    quantity: integer().notNull(),
    fromPharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    toPharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    status: transferStatus().notNull().default("requested"),
    refusalReason: text(),
    createdAt: createdAt(),
    shippedAt: timestamp({ withTimezone: true }),
    receivedAt: timestamp({ withTimezone: true }),
});

export const purchaseOrders = pgTable("purchase_orders", {
    id: id(),
    pharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    medicationId: uuid()
        .notNull()
        .references(() => medications.id),
    quantity: integer().notNull(),
    supplierId: uuid()
        .notNull()
        .references(() => suppliers.id),
    status: purchaseStatus().notNull().default("placed"),
    expectedAt: date(),
    origin: purchaseOrigin().notNull(),
    invoiceNumber: text(),
    shippedBatchNumber: text(),
    shippedExpiryDate: date(),
    shippedQuantity: integer(),
    shippedAt: timestamp({ withTimezone: true }),
    receivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
});

export const waitlistEntries = pgTable("waitlist_entries", {
    id: id(),
    requestId: uuid()
        .notNull()
        .references(() => medicationRequests.id),
    patientId: uuid()
        .notNull()
        .references(() => patients.userId),
    medicationId: uuid()
        .notNull()
        .references(() => medications.id),
    pharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    purchaseOrderId: uuid().references(() => purchaseOrders.id),
    priority: integer().notNull(),
    status: waitlistStatus().notNull().default("waiting"),
    createdAt: createdAt(),
});

export const dispensations = pgTable("dispensations", {
    id: id(),
    requestId: uuid()
        .notNull()
        .references(() => medicationRequests.id),
    pharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    medicationId: uuid()
        .notNull()
        .references(() => medications.id),
    batchId: uuid()
        .notNull()
        .references(() => stockBatches.id),
    quantity: integer().notNull(),
    dispensedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    staffUserId: uuid()
        .notNull()
        .references(() => users.id),
    prescriptionId: uuid().references(() => prescriptions.id),
    pickedUpBy: pickedUpBy().notNull(),
    caregiverId: uuid().references(() => caregivers.id),
    partialReason: text(),
});

export const deliveries = pgTable("deliveries", {
    id: id(),
    requestId: uuid()
        .notNull()
        .references(() => medicationRequests.id),
    method: text().notNull().default("municipal_program"),
    courierId: uuid().references(() => couriers.userId),
    scheduledByStaffId: uuid()
        .notNull()
        .references(() => users.id),
    addressSnapshot: jsonb().$type<Address>().notNull(),
    scheduledWindow: text().notNull(),
    requiresRefrigeration: boolean().notNull(),
    status: deliveryStatus().notNull().default("scheduled"),
    receivedBy: text(),
    failureReason: text(),
    createdAt: createdAt(),
    pickedUpAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
});

export const notifications = pgTable("notifications", {
    id: id(),
    userId: uuid()
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    requestId: uuid().references(() => medicationRequests.id),
    title: text().notNull(),
    body: text().notNull(),
    createdAt: createdAt(),
    readAt: timestamp({ withTimezone: true }),
});

// Histórico da própria paciente (só ela vê e pode apagar). Separado de search_events,
// que é anônimo e serve só para o painel do gestor.
export const patientRecentMedications = pgTable(
    "patient_recent_medications",
    {
        patientId: uuid()
            .notNull()
            .references(() => patients.userId, { onDelete: "cascade" }),
        medicationId: uuid()
            .notNull()
            .references(() => medications.id),
        viewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("patient_recent_medications_patient_medication").on(
            t.patientId,
            t.medicationId,
        ),
    ],
);

export const searchEvents = pgTable("search_events", {
    id: id(),
    medicationId: uuid()
        .notNull()
        .references(() => medications.id),
    pharmacyId: uuid()
        .notNull()
        .references(() => pharmacies.id),
    foundInNetwork: boolean().notNull(),
    createdAt: createdAt(),
});
