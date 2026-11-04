import { apiFetch } from "./client";
import type { CourierAction, DeliveryView, Items } from "./types";

/** "available": sem dados da paciente até aceitar (LGPD). "mine": as aceitas por mim. */
export async function listCourierDeliveries(scope: "available" | "mine"): Promise<DeliveryView[]> {
    return (await apiFetch<Items<DeliveryView>>("/courier/deliveries", { query: { scope } })).items;
}

export async function courierAction(id: string, body: CourierAction): Promise<DeliveryView> {
    return (
        await apiFetch<{ delivery: DeliveryView }>(`/courier/deliveries/${id}/actions`, {
            method: "POST",
            body,
        })
    ).delivery;
}
