import type { DeliveryView } from "../../api/types";

export const DELIVERY_STATUS: Record<DeliveryView["status"], string> = {
    scheduled: "Retirar na unidade",
    out_for_delivery: "A caminho",
    delivered: "Entregue",
    failed: "Não entregue",
};
