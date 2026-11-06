import { apiFetch } from "./client";
import type {
    CreateAccountInput,
    ExpiringBatch,
    Items,
    ManagerSummary,
    MedicationComponent,
    MedicationPage,
    PharmacyInput,
    StaffAccount,
    StaffRole,
    SessionUser,
    UnmetDemandItem,
} from "./types";

export function getSummary(): Promise<ManagerSummary> {
    return apiFetch<ManagerSummary>("/manager/summary");
}

/** Buscas sem estoque por remédio e unidade (padrão: últimos 7 dias). */
export async function getUnmetDemand(from?: string, to?: string): Promise<UnmetDemandItem[]> {
    return (
        await apiFetch<Items<UnmetDemandItem>>("/manager/unmet-demand", { query: { from, to } })
    ).items;
}

export async function getExpiringStock(days = 60): Promise<ExpiringBatch[]> {
    return (await apiFetch<Items<ExpiringBatch>>("/manager/expiring-stock", { query: { days } }))
        .items;
}

export async function createAccount(input: CreateAccountInput): Promise<SessionUser> {
    return (
        await apiFetch<{ user: SessionUser }>("/manager/users", { method: "POST", body: input })
    ).user;
}

/** Catálogo em páginas de 25, com busca opcional. */
export function listMedicationsPage(
    search: string,
    page: number,
    component: MedicationComponent | "" = "",
): Promise<MedicationPage> {
    return apiFetch<MedicationPage>("/manager/medications", {
        query: { search: search.trim() || undefined, page, component: component || undefined },
    });
}

/** Contas da equipe (sem pacientes); `role` vazio traz todas. */
export async function listStaffAccounts(role: StaffRole | ""): Promise<StaffAccount[]> {
    return (
        await apiFetch<Items<StaffAccount>>("/manager/users", {
            query: { role: role || undefined },
        })
    ).items;
}

export async function setStaffActive(id: string, active: boolean): Promise<void> {
    await apiFetch<{ ok: true }>(`/manager/users/${id}`, { method: "PATCH", body: { active } });
}

/** Cadastra uma unidade nova da rede. */
export async function createPharmacy(input: PharmacyInput): Promise<{ id: string }> {
    return (
        await apiFetch<{ pharmacy: { id: string } }>("/manager/pharmacies", {
            method: "POST",
            body: input,
        })
    ).pharmacy;
}
