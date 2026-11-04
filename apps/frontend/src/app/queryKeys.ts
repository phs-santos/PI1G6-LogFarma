import type { RequestStatus } from "../api/types";

/** Telas "ao vivo" (pedido, fila da farmácia): consulta a cada 3 s com a aba aberta. */
export const LIVE = 3000;
/** Demais listas: a cada 30 s. */
export const REGULAR = 30000;

/** Chaves estáveis de cache, usadas por todas as telas. */
export const qk = {
    me: ["me"] as const,
    profile: ["profile"] as const,
    caregivers: ["caregivers"] as const,
    recentMedications: ["recent-medications"] as const,
    prescriptions: (medicationId?: string) => ["prescriptions", medicationId ?? "all"] as const,
    notifications: (unread?: boolean) => ["notifications", unread ? "unread" : "all"] as const,
    requests: ["requests"] as const,
    request: (id: string) => ["requests", id] as const,
    search: (q: string) => ["medications", "search", q] as const,
    medication: (id: string) => ["medications", id] as const,
    availability: (medicationId: string) => ["availability", medicationId] as const,
    pharmacies: ["pharmacies"] as const,
    suppliers: ["suppliers"] as const,
    pharmacy: {
        all: ["pharmacy"] as const,
        requests: (status?: RequestStatus) => ["pharmacy", "requests", status ?? "all"] as const,
        transfers: (direction?: "incoming" | "outgoing") =>
            ["pharmacy", "transfers", direction ?? "all"] as const,
        stock: ["pharmacy", "stock"] as const,
        deliveries: ["pharmacy", "deliveries"] as const,
        purchaseOrders: ["pharmacy", "purchase-orders"] as const,
        waitlist: (medicationId: string) => ["pharmacy", "waitlist", medicationId] as const,
        network: (medicationId: string) => ["pharmacy", "network", medicationId] as const,
    },
    courier: {
        deliveries: (scope: "available" | "mine") => ["courier", "deliveries", scope] as const,
    },
    supplier: {
        purchaseOrders: ["supplier", "purchase-orders"] as const,
    },
    manager: {
        summary: ["manager", "summary"] as const,
        unmetDemand: ["manager", "unmet-demand"] as const,
        expiring: ["manager", "expiring"] as const,
    },
};
