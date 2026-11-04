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
