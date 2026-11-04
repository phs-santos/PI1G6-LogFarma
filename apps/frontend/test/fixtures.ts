import type {
    AvailabilityItem,
    AvailabilityResponse,
    MedicationSummary,
    NotificationView,
    PharmacyView,
} from "../src/api/types";

export const losartana: MedicationSummary = {
    id: "med-los",
    displayName: "Losartana potássica 50 mg comprimido",
    activeIngredient: "Losartana potássica",
    concentration: "50 mg",
    pharmaceuticalForm: "tablet",
    component: "basic",
    prescriptionType: "simple",
    storage: "room_temperature",
};

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export function unit(
    over: Partial<AvailabilityItem> & Pick<AvailabilityItem, "pharmacyId" | "pharmacyName">,
): AvailabilityItem {
    return {
        kind: "ubs",
        isReference: false,
        status: "available",
        updatedAt: hoursAgo(2),
        distanceKm: 1.1,
        routeUrl:
            "https://www.google.com/maps/dir/?api=1&origin=-21.4,-48.5&destination=-21.41,-48.51",
        consultationOnly: false,
        openingHours: "Segunda a sexta, 7h às 17h",
        address: "Rua São Sebastião, 455, Jardim São Sebastião, Taquaritinga",
        ...over,
    };
}

/** Cena 1: a UBS Centro (dela) está sem; a Jardim tem; Farmácia Popular só consulta. */
export function cena1Availability(): AvailabilityResponse {
    return {
        medication: losartana,
        foundInNetwork: true,
        items: [
            unit({
                pharmacyId: "ph-centro",
                pharmacyName: "UBS Centro",
                isReference: true,
                status: "out",
                distanceKm: 0.3,
                address: "Rua Sete de Setembro, 100, Centro, Taquaritinga",
            }),
            unit({
                pharmacyId: "ph-pfpb",
                pharmacyName: "Drogaria Popular Central",
                kind: "pfpb",
                status: "unknown",
                updatedAt: null,
                consultationOnly: true,
                distanceKm: 0.5,
                address: "Rua Prudente de Moraes, 300, Centro, Taquaritinga",
            }),
            unit({
                pharmacyId: "ph-vila",
                pharmacyName: "UBS Vila Negri",
                status: "out",
                distanceKm: 0.8,
            }),
            unit({ pharmacyId: "ph-jardim", pharmacyName: "UBS Jardim São Sebastião" }),
        ],
    };
}

export const pharmacies: PharmacyView[] = [
    ["ph-centro", "UBS Centro", "ubs", "(16) 3252-1000"],
    ["ph-jardim", "UBS Jardim São Sebastião", "ubs", "(16) 3252-2000"],
    ["ph-vila", "UBS Vila Negri", "ubs", "(16) 3252-3000"],
    ["ph-pfpb", "Drogaria Popular Central", "pfpb", "(16) 3252-9000"],
].map(([id, name, kind, phone]) => ({
    id: id!,
    name: name!,
    kind: kind as PharmacyView["kind"],
    network: kind === "pfpb" ? "pfpb" : "municipal",
    address: "Taquaritinga",
    openingHours: "Segunda a sexta, 7h às 17h",
    phone: phone!,
    latitude: null,
    longitude: null,
}));

export function notification(
    over: Partial<NotificationView> & Pick<NotificationView, "id" | "title">,
): NotificationView {
    return {
        body: "",
        requestId: null,
        createdAt: new Date().toISOString(),
        readAt: null,
        ...over,
    };
}

import type { CaregiverView, MyPrescription, PatientProfile, RequestView } from "../src/api/types";

/** Pedido da Maria; por padrão acabou de chegar à UBS Centro vindo da Jardim (cena 2). */
export function requestView(over: Partial<RequestView> = {}): RequestView {
    return {
        id: "req-1",
        status: "arrived",
        fulfillment: "delivery",
        quantity: 30,
        medication: losartana,
        pharmacy: {
            id: "ph-centro",
            name: "UBS Centro",
            address: "Rua Sete de Setembro, 100, Centro, Taquaritinga",
            openingHours: "Segunda a sexta, 7h às 17h",
        },
        sourcePharmacy: { id: "ph-jardim", name: "UBS Jardim São Sebastião" },
        expectedAt: null,
        prescription: null,
        waitlistPosition: null,
        delivery: null,
        createdAt: new Date(2026, 10, 4, 9, 0).toISOString(),
        updatedAt: new Date(2026, 10, 4, 10, 32).toISOString(),
        ...over,
    };
}

export function patientProfile(over: Partial<PatientProfile> = {}): PatientProfile {
    return {
        fullName: "Maria Aparecida da Silva",
        socialName: null,
        birthDate: "1951-03-12",
        cns: "898001234567890",
        cpf: null,
        phone: "16991234567",
        address: {
            street: "Rua Sete de Setembro",
            number: "50",
            district: "Centro",
            city: "Taquaritinga",
            state: "SP",
            zip: "15900000",
        },
        latitude: null,
        longitude: null,
        referencePharmacy: { id: "ph-centro", name: "UBS Centro" },
        mobilityLimited: false,
        priority: null,
        ...over,
    };
}

export const usablePrescription: MyPrescription = {
    id: "rx-1",
    type: "simple",
    issuedAt: "2026-09-01",
    validUntil: "2027-03-01",
    prescriberName: "Dra. Helena Prado",
    checked: true,
    medicationId: "med-los",
    usable: true,
};

export const caregiverJoana: CaregiverView = {
    id: "cg-1",
    fullName: "Joana da Silva",
    document: "12345678900",
    relationship: "filha",
    phone: "16998887777",
};

import type {
    MedicationSummary as Med,
    NetworkItem,
    PharmacyRequestItem,
    UnitStockItem,
} from "../src/api/types";

export const amoxicilina: Med = {
    id: "med-amox",
    displayName: "Amoxicilina 500 mg cápsula",
    activeIngredient: "Amoxicilina",
    concentration: "500 mg",
    pharmaceuticalForm: "capsule",
    component: "basic",
    prescriptionType: "antimicrobial",
    storage: "room_temperature",
};

/** Pedido novo da Maria no balcão da UBS Centro. */
export function pharmacyItem(over: Partial<RequestView> = {}): PharmacyRequestItem {
    return {
        request: requestView({
            status: "requested",
            sourcePharmacy: null,
            fulfillment: "delivery",
            prescription: {
                id: "rx-1",
                type: "simple",
                issuedAt: "2026-09-01",
                validUntil: "2027-03-01",
                prescriberName: "Dra. Helena Prado",
                checked: true,
            },
            ...over,
        }),
        patient: {
            name: "Maria Aparecida da Silva",
            cns: "898001234567890",
            age: 75,
            phone: "16991234567",
            address: "Rua Sete de Setembro, 50 — Centro, Taquaritinga/SP",
            caregivers: [{ id: "cg-1", fullName: "Joana da Silva", relationship: "filha" }],
        },
    };
}

export const networkCena2: NetworkItem[] = [
    { pharmacyId: "ph-jardim", pharmacyName: "UBS Jardim São Sebastião", available: 120 },
    { pharmacyId: "ph-vila", pharmacyName: "UBS Vila Negri", available: 25 },
];

export function stockOf(med: Med, available: number): UnitStockItem {
    return {
        medication: med,
        available,
        reserved: 0,
        minQuantity: 50,
        updatedAt: new Date().toISOString(),
        batches: available
            ? [
                  {
                      id: "b1",
                      batchNumber: "L-001",
                      expiryDate: "2027-05-01",
                      quantity: available,
                      reserved: 0,
                  },
              ]
            : [],
    };
}
