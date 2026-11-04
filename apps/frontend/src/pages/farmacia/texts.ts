import type { RequestStatus } from "../../api/types";

/** Situação do pedido na linguagem do balcão. */
export const STAFF_STATUS: Record<RequestStatus, string> = {
    requested: "Novo",
    ready_for_pickup: "Separado",
    in_transfer: "Em transferência",
    waitlisted: "Lista de espera",
    arrived: "Chegou na unidade",
    delivery_scheduled: "Entrega agendada",
    out_for_delivery: "Saiu para entrega",
    picked_up: "Retirado",
    delivered: "Entregue",
    cancelled: "Cancelado",
};

export const OPEN_STATUSES: RequestStatus[] = [
    "requested",
    "waitlisted",
    "in_transfer",
    "arrived",
    "ready_for_pickup",
    "delivery_scheduled",
    "out_for_delivery",
];
