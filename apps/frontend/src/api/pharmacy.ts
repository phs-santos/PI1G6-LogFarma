import { apiFetch } from "./client";
import type {
    CounterAction,
    DeliveryView,
    Items,
    NetworkItem,
    NewBatchInput,
    PharmacyRequestItem,
    PrescriptionView,
    PurchaseOrderView,
    RequestStatus,
    RequestView,
    TransferAction,
    TransferView,
    UnitStockItem,
    WaitlistItem,
} from "./types";

export { listSuppliers } from "./pharmacies";
export { attachPrescription } from "./requests";

export async function listPharmacyRequests(status?: RequestStatus): Promise<PharmacyRequestItem[]> {
    return (await apiFetch<Items<PharmacyRequestItem>>("/pharmacy/requests", { query: { status } }))
        .items;
}

export async function counterAction(id: string, body: CounterAction): Promise<RequestView> {
    return (
        await apiFetch<{ request: RequestView }>(`/pharmacy/requests/${id}/actions`, {
            method: "POST",
            body,
        })
    ).request;
}

export async function checkPrescription(prescriptionId: string): Promise<PrescriptionView> {
    return (
        await apiFetch<{ prescription: PrescriptionView }>(
            `/pharmacy/prescriptions/${prescriptionId}/check`,
            { method: "POST" },
        )
    ).prescription;
}

/** Outras unidades públicas que têm o remédio, maior estoque primeiro. */
export async function getNetworkAvailability(medicationId: string): Promise<NetworkItem[]> {
    return (
        await apiFetch<Items<NetworkItem>>("/pharmacy/network-availability", {
            query: { medicationId },
        })
    ).items;
}

export async function listTransfers(direction?: "incoming" | "outgoing"): Promise<TransferView[]> {
    return (await apiFetch<Items<TransferView>>("/pharmacy/transfers", { query: { direction } }))
        .items;
}

export async function transferAction(id: string, body: TransferAction): Promise<TransferView> {
    return (
        await apiFetch<{ transfer: TransferView }>(`/pharmacy/transfers/${id}/actions`, {
            method: "POST",
            body,
        })
    ).transfer;
}

export async function listUnitStock(): Promise<UnitStockItem[]> {
    return (await apiFetch<Items<UnitStockItem>>("/pharmacy/stock")).items;
}

export async function setMinQuantity(medicationId: string, minQuantity: number): Promise<void> {
    await apiFetch(`/pharmacy/stock/${medicationId}`, { method: "PATCH", body: { minQuantity } });
}

export async function addBatch(input: NewBatchInput): Promise<void> {
    await apiFetch("/pharmacy/stock/batches", { method: "POST", body: input });
}

export async function adjustBatch(
    batchId: string,
    body: { delta: number; reason: "exit_loss" | "adjustment" },
): Promise<void> {
    await apiFetch(`/pharmacy/stock/batches/${batchId}/adjust`, { method: "POST", body });
}

export async function listPharmacyDeliveries(): Promise<DeliveryView[]> {
    return (await apiFetch<Items<DeliveryView>>("/pharmacy/deliveries")).items;
}

export async function listPharmacyPurchaseOrders(): Promise<PurchaseOrderView[]> {
    return (await apiFetch<Items<PurchaseOrderView>>("/pharmacy/purchase-orders")).items;
}

export async function receivePurchaseOrder(id: string): Promise<PurchaseOrderView> {
    return (
        await apiFetch<{ purchaseOrder: PurchaseOrderView }>(
            `/pharmacy/purchase-orders/${id}/actions`,
            {
                method: "POST",
                body: { action: "receive" },
            },
        )
    ).purchaseOrder;
}

export async function listWaitlist(medicationId: string): Promise<WaitlistItem[]> {
    return (await apiFetch<Items<WaitlistItem>>("/pharmacy/waitlist", { query: { medicationId } }))
        .items;
}
