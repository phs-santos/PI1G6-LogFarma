import { apiFetch } from "./client";
import type {
    AvailabilityResponse,
    Items,
    Medication,
    MedicationInput,
    MedicationSummary,
} from "./types";

export async function searchMedications(q: string): Promise<MedicationSummary[]> {
    const { items } = await apiFetch<Items<MedicationSummary>>("/medications", {
        query: { search: q },
    });
    return items;
}

/** RF01–RF03: onde o remédio está, da unidade dela para as mais próximas. */
export function getAvailability(medicationId: string): Promise<AvailabilityResponse> {
    return apiFetch<AvailabilityResponse>(`/medications/${medicationId}/availability`);
}

export async function getMedication(id: string): Promise<Medication> {
    return (await apiFetch<{ medication: Medication }>(`/medications/${id}`)).medication;
}

export async function createMedication(input: MedicationInput): Promise<Medication> {
    return (
        await apiFetch<{ medication: Medication }>("/medications", { method: "POST", body: input })
    ).medication;
}

export async function updateMedication(
    id: string,
    patch: Partial<MedicationInput>,
): Promise<Medication> {
    return (
        await apiFetch<{ medication: Medication }>(`/medications/${id}`, {
            method: "PATCH",
            body: patch,
        })
    ).medication;
}
