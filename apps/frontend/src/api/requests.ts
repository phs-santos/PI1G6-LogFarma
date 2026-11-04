import { apiFetch } from "./client";
import type {
    CreateRequestInput,
    Fulfillment,
    Items,
    PrescriptionInput,
    RequestView,
} from "./types";

type One = { request: RequestView };

export async function createRequest(input: CreateRequestInput): Promise<RequestView> {
    return (await apiFetch<One>("/requests", { method: "POST", body: input })).request;
}

export async function listRequests(): Promise<RequestView[]> {
    return (await apiFetch<Items<RequestView>>("/requests")).items;
}

export async function getRequest(id: string): Promise<RequestView> {
    return (await apiFetch<One>(`/requests/${id}`)).request;
}

export async function updateRequest(
    id: string,
    patch: { fulfillment: Fulfillment } | { cancel: true },
): Promise<RequestView> {
    return (await apiFetch<One>(`/requests/${id}`, { method: "PATCH", body: patch })).request;
}

export async function attachPrescription(
    id: string,
    input: PrescriptionInput,
): Promise<RequestView> {
    return (await apiFetch<One>(`/requests/${id}/prescription`, { method: "POST", body: input }))
        .request;
}
