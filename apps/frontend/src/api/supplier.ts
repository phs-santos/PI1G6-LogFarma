import { apiFetch } from "./client";
import type { Items, PurchaseOrderView, SupplierAction } from "./types";

export async function listSupplierOrders(): Promise<PurchaseOrderView[]> {
    return (await apiFetch<Items<PurchaseOrderView>>("/supplier/purchase-orders")).items;
}

export async function supplierAction(id: string, body: SupplierAction): Promise<PurchaseOrderView> {
    return (
        await apiFetch<{ purchaseOrder: PurchaseOrderView }>(
            `/supplier/purchase-orders/${id}/actions`,
            {
                method: "POST",
                body,
            },
        )
    ).purchaseOrder;
}
