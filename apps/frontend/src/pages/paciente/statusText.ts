import type { RequestStatus } from "../../api/types";

/** A situação do pedido como a paciente fala (nunca "status" ou "dispensado"). */
export const STATUS_TEXT: Record<RequestStatus, string> = {
    requested: "A farmácia recebeu seu pedido",
    ready_for_pickup: "Pronto para você retirar",
    in_transfer: "A caminho da sua unidade",
    waitlisted: "Na lista de espera",
    arrived: "Chegou na unidade",
    delivery_scheduled: "Entrega agendada",
    out_for_delivery: "Saiu para entrega",
    picked_up: "Retirado",
    delivered: "Entregue",
    cancelled: "Cancelado",
};
