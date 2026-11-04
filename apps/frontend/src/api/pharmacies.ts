import { apiFetch } from "./client";
import type { Items, PharmacyView, SupplierItem } from "./types";

export async function listPharmacies(): Promise<PharmacyView[]> {
    return (await apiFetch<Items<PharmacyView>>("/pharmacies")).items;
}

export async function listSuppliers(): Promise<SupplierItem[]> {
    return (await apiFetch<Items<SupplierItem>>("/suppliers")).items;
}
