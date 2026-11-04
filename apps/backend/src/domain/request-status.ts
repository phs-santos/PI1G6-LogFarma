import { ConflictError } from "./errors.js";

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

// Setas do diagrama do design + falha de entrega e recusa de transferência.
const ALLOWED: Record<RequestStatus, RequestStatus[]> = {
    requested: ["ready_for_pickup", "in_transfer", "waitlisted", "cancelled"],
    in_transfer: ["arrived", "requested"],
    waitlisted: ["arrived", "ready_for_pickup", "cancelled"],
    arrived: ["ready_for_pickup", "delivery_scheduled"],
    ready_for_pickup: ["delivery_scheduled", "picked_up"],
    delivery_scheduled: ["out_for_delivery"],
    out_for_delivery: ["delivered", "arrived"],
    picked_up: [],
    delivered: [],
    cancelled: [],
};

const LABEL: Record<RequestStatus, string> = {
    requested: "aguardando a farmácia",
    ready_for_pickup: "pronto para retirada",
    in_transfer: "em transferência",
    waitlisted: "na lista de espera",
    arrived: "chegou na unidade",
    delivery_scheduled: "entrega agendada",
    out_for_delivery: "saiu para entrega",
    picked_up: "retirado",
    delivered: "entregue",
    cancelled: "cancelado",
};

export function assertTransition(from: RequestStatus, to: RequestStatus): void {
    if (!ALLOWED[from].includes(to)) {
        throw new ConflictError(
            `O pedido está "${LABEL[from]}" e não pode passar para "${LABEL[to]}".`,
        );
    }
}

export function statusLabel(status: RequestStatus): string {
    return LABEL[status];
}
