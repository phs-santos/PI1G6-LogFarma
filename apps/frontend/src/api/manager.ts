import { apiFetch } from "./client";
import type {
    CreateAccountInput,
    ExpiringBatch,
    Items,
    ManagerSummary,
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
