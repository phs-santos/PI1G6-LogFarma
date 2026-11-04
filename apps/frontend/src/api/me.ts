import { apiFetch } from "./client";
import type {
    CaregiverInput,
    CaregiverView,
    Items,
    MyPrescription,
    PatientProfile,
    ProfilePatch,
    RecentMedication,
} from "./types";

export async function getProfile(): Promise<PatientProfile> {
    return (await apiFetch<{ profile: PatientProfile }>("/me")).profile;
}

export async function updateProfile(patch: ProfilePatch): Promise<PatientProfile> {
    return (await apiFetch<{ profile: PatientProfile }>("/me", { method: "PATCH", body: patch }))
        .profile;
}

export async function listMyPrescriptions(medicationId?: string): Promise<MyPrescription[]> {
    return (await apiFetch<Items<MyPrescription>>("/me/prescriptions", { query: { medicationId } }))
        .items;
}

export async function listCaregivers(): Promise<CaregiverView[]> {
    return (await apiFetch<Items<CaregiverView>>("/me/caregivers")).items;
}

export async function addCaregiver(input: CaregiverInput): Promise<CaregiverView> {
    return (
        await apiFetch<{ caregiver: CaregiverView }>("/me/caregivers", {
            method: "POST",
            body: input,
        })
    ).caregiver;
}

export async function removeCaregiver(id: string): Promise<void> {
    await apiFetch<{ ok: true }>(`/me/caregivers/${id}`, { method: "DELETE" });
}

/** Últimos remédios que a paciente consultou (só ela vê). */
export async function listRecentMedications(): Promise<RecentMedication[]> {
    return (await apiFetch<Items<RecentMedication>>("/me/recent-medications")).items;
}

export async function clearRecentMedications(): Promise<void> {
    await apiFetch<{ ok: true }>("/me/recent-medications", { method: "DELETE" });
}
