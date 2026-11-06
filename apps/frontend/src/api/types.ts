// Espelho dos contratos da API (apps/backend/src/contracts.ts, services/*.ts, routes/*.ts).
// Mudou lá, muda aqui.

export type UserRole = "patient" | "pharmacy_staff" | "supplier_staff" | "courier" | "manager";
export type PriorityCategory = "chronic" | "oncology" | "rare_disease";
export type StaffOccupation = "pharmacist" | "pharmacy_assistant";
export type PharmacyKind = "ubs" | "municipal_pharmacy" | "specialized_pharmacy" | "pfpb";
export type PrescriptionType = "none" | "simple" | "antimicrobial" | "special_control";
export type PharmaceuticalForm =
    | "tablet"
    | "capsule"
    | "oral_solution"
    | "oral_suspension"
    | "injectable"
    | "cream"
    | "inhaler"
    | "other";
export type AdministrationRoute =
    "oral" | "subcutaneous" | "intramuscular" | "intravenous" | "topical" | "inhalation" | "other";
export type MedicationComponent = "basic" | "strategic" | "specialized";
export type StorageCondition = "room_temperature" | "refrigerated";
export type Fulfillment = "pickup" | "delivery";
export type RequestStatus =
    | "requested"
    | "ready_for_pickup"
    | "in_transfer"
    | "waitlisted"
    | "arrived"
    | "delivery_scheduled"
    | "out_for_delivery"
    | "picked_up"
    | "delivered"
    | "cancelled";

export interface SessionUser {
    id: string;
    role: UserRole;
}

export type MeProfile =
    | { kind: "patient"; displayName: string; referencePharmacy: { id: string; name: string } }
    | {
          kind: "pharmacy_staff";
          fullName: string;
          occupation: StaffOccupation;
          pharmacy: { id: string; name: string };
      }
    | { kind: "supplier_staff"; fullName: string; supplier: { id: string; name: string } }
    | { kind: "courier"; fullName: string }
    | { kind: "manager"; fullName: string };

export interface Session {
    user: SessionUser;
    profile: MeProfile;
}

export interface Address {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    zip: string;
}

/** Aba da tela Entrar: "Sou paciente" (`patient`) ou "Sou da equipe" (`team`). */
export type LoginAudience = "patient" | "team";

export interface LoginInput {
    email: string;
    password: string;
    /** Quando vem, a conta precisa ser dessa aba; senão a API responde 403. */
    audience?: LoginAudience;
}

export interface RegisterPatientInput {
    email: string;
    password: string;
    fullName: string;
    socialName?: string;
    birthDate: string;
    cns: string;
    cpf?: string;
    phone: string;
    address: Address;
    latitude?: number;
    longitude?: number;
    referencePharmacyId: string;
    mobilityLimited: boolean;
    priority?: { category: PriorityCategory; consent: true };
}

export interface CreateAccountInput {
    role: Exclude<UserRole, "patient">;
    email: string;
    password: string;
    fullName: string;
    pharmacyId?: string;
    occupation?: StaffOccupation;
    crfNumber?: string;
    crfState?: string;
    supplierId?: string;
    phone?: string;
    deliveryProgram?: string;
}

export type StaffRole = Exclude<UserRole, "patient">;

/** Conta da equipe na lista da gestão (paciente não aparece). */
export interface StaffAccount {
    id: string;
    role: StaffRole;
    email: string;
    active: boolean;
    createdAt: string;
    name: string;
    place: string | null;
    occupation: StaffOccupation | null;
}

export interface PharmacyInput {
    name: string;
    kind: PharmacyKind;
    network: PharmacyView["network"];
    address: string;
    phone: string;
    openingHours: string;
    cnes?: string;
    cnpj?: string;
}

export interface MedicationPage {
    items: MedicationSummary[];
    total: number;
    page: number;
    pageSize: number;
}

export interface MedicationSummary {
    id: string;
    displayName: string;
    activeIngredient: string;
    concentration: string;
    pharmaceuticalForm: PharmaceuticalForm;
    component: MedicationComponent;
    prescriptionType: PrescriptionType;
    storage: StorageCondition;
}

export interface Medication {
    id: string;
    activeIngredient: string;
    concentration: string;
    pharmaceuticalForm: PharmaceuticalForm;
    route: AdministrationRoute;
    dispensingUnit: string;
    component: MedicationComponent;
    therapeuticClass: string;
    prescriptionType: PrescriptionType;
    storage: StorageCondition;
    inRename: boolean;
    inFarmaciaPopular: boolean;
    catmatCode: string | null;
    createdAt: string;
}

export type MedicationInput = Omit<Medication, "id" | "createdAt" | "catmatCode"> & {
    catmatCode?: string | null;
};

export interface AvailabilityItem {
    pharmacyId: string;
    pharmacyName: string;
    kind: PharmacyKind;
    isReference: boolean;
    status: "available" | "low" | "out" | "unknown";
    updatedAt: string | null;
    distanceKm: number | null;
    routeUrl: string | null;
    consultationOnly: boolean;
    openingHours: string;
    address: string;
}

export interface AvailabilityResponse {
    medication: MedicationSummary;
    foundInNetwork: boolean;
    items: AvailabilityItem[];
}

export interface NetworkItem {
    pharmacyId: string;
    pharmacyName: string;
    available: number;
}

export interface PharmacyView {
    id: string;
    name: string;
    kind: PharmacyKind;
    network: "municipal" | "state" | "pfpb";
    address: string;
    openingHours: string;
    phone: string;
    latitude: number | null;
    longitude: number | null;
}

export interface SupplierItem {
    id: string;
    name: string;
    cnpj: string;
}

export interface PrescriptionInput {
    issuedAt: string;
    prescriberName: string;
    prescriberCouncil: string;
    prescriberNumber: string;
    prescriberState: string;
    continuousUse: boolean;
}

export interface PrescriptionView {
    id: string;
    type: "simple" | "antimicrobial" | "special_control";
    issuedAt: string;
    validUntil: string;
    prescriberName: string;
    checked: boolean;
}

export type MyPrescription = PrescriptionView & { medicationId: string; usable: boolean };

export interface CreateRequestInput {
    medicationId: string;
    quantity: number;
    fulfillment: Fulfillment;
    prescription?: PrescriptionInput;
    prescriptionId?: string;
}

export interface RequestView {
    id: string;
    status: RequestStatus;
    fulfillment: Fulfillment;
    quantity: number;
    medication: MedicationSummary;
    pharmacy: { id: string; name: string; address: string; openingHours: string };
    sourcePharmacy: { id: string; name: string } | null;
    expectedAt: string | null;
    prescription: PrescriptionView | null;
    waitlistPosition: number | null;
    delivery: {
        id: string;
        status: string;
        scheduledWindow: string;
        requiresRefrigeration: boolean;
    } | null;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationView {
    id: string;
    title: string;
    body: string;
    requestId: string | null;
    createdAt: string;
    readAt: string | null;
}

export interface PatientProfile {
    fullName: string;
    socialName: string | null;
    birthDate: string;
    cns: string;
    cpf: string | null;
    phone: string;
    address: Address;
    latitude: number | null;
    longitude: number | null;
    referencePharmacy: { id: string; name: string };
    mobilityLimited: boolean;
    priority: { category: PriorityCategory; consentAt: string } | null;
}

export interface ProfilePatch {
    phone?: string;
    address?: Address;
    latitude?: number | null;
    longitude?: number | null;
    mobilityLimited?: boolean;
    referencePharmacyId?: string;
    priority?: { category: PriorityCategory; consent: true } | { revoke: true };
}

export interface CaregiverView {
    id: string;
    fullName: string;
    document: string;
    relationship: string;
    phone: string;
}

export interface CaregiverInput {
    fullName: string;
    document: string;
    relationship: string;
    phone: string;
}

export type CounterAction =
    | { action: "prepare" }
    | { action: "dispense"; pickedUpBy: "patient" | "caregiver"; caregiverId?: string }
    | { action: "schedule_delivery"; scheduledWindow: string; courierId?: string }
    | { action: "request_transfer"; fromPharmacyId: string }
    | { action: "order_from_supplier"; supplierId?: string };

export interface PharmacyRequestItem {
    request: RequestView;
    patient: {
        name: string;
        cns: string;
        age: number;
        phone: string;
        address: string | null;
        caregivers: { id: string; fullName: string; relationship: string }[];
    };
}

export interface TransferView {
    id: string;
    requestId: string | null;
    status: "requested" | "shipped" | "received" | "refused";
    quantity: number;
    medication: string;
    batchNumber: string;
    expiryDate: string;
    from: { id: string; name: string };
    to: { id: string; name: string };
    refusalReason: string | null;
    createdAt: string;
}

export type TransferAction =
    { action: "ship" } | { action: "refuse"; reason: string } | { action: "receive" };

export interface PurchaseOrderView {
    id: string;
    status: "placed" | "confirmed" | "no_date" | "shipped" | "received";
    origin: "manual" | "auto_min_stock";
    medication: string;
    quantity: number;
    pharmacy: { id: string; name: string; address: string };
    supplier: { id: string; name: string };
    expectedAt: string | null;
    invoiceNumber: string | null;
    shippedBatchNumber: string | null;
    shippedExpiryDate: string | null;
    shippedQuantity: number | null;
    waitingPatients: number;
    createdAt: string;
}

export type SupplierAction =
    | { action: "confirm"; expectedAt: string }
    | { action: "no_date" }
    | {
          action: "ship";
          invoiceNumber: string;
          batchNumber: string;
          expiryDate: string;
          quantity: number;
      };

export interface WaitlistItem {
    position: number;
    requestId: string;
    patientName: string;
    category: PriorityCategory | null;
    ageGroup: "80+" | "60+" | null;
    quantity: number;
    createdAt: string;
}

export interface DeliveryView {
    id: string;
    requestId: string;
    status: "scheduled" | "out_for_delivery" | "delivered" | "failed";
    scheduledWindow: string;
    requiresRefrigeration: boolean;
    courierId: string | null;
    /** null para o entregador até ele aceitar a entrega. */
    medication: string | null;
    pharmacy: { name: string; address: string };
    area: string;
    recipient: { name: string; address: string; phone: string } | null;
    receivedBy: string | null;
    failureReason: string | null;
    createdAt: string;
}

export type CourierAction =
    | { action: "accept" }
    | { action: "pick_up" }
    | { action: "deliver"; receivedBy: string }
    | { action: "fail"; reason: string };

export interface UnitStockItem {
    medication: MedicationSummary;
    available: number;
    reserved: number;
    minQuantity: number;
    updatedAt: string;
    batches: {
        id: string;
        batchNumber: string;
        expiryDate: string;
        quantity: number;
        reserved: number;
    }[];
}

export interface NewBatchInput {
    medicationId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    manufacturerCnpj?: string;
    anvisaRegistration?: string;
}

export interface UnmetDemandItem {
    medicationId: string;
    displayName: string;
    pharmacyId: string;
    pharmacyName: string;
    searches: number;
}

export interface ExpiringBatch {
    pharmacyName: string;
    displayName: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
}

export interface ManagerSummary {
    unmetSearches7d: number;
    expiringBatches60d: number;
    waitingPatients: number;
}

export interface Items<T> {
    items: T[];
}

export interface RecentMedication {
    medication: MedicationSummary;
    viewedAt: string;
}
