// RF01, RF02, RF03 — onde o remédio está disponível na rede, da unidade de referência para as mais próximas.
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { medications, patients, pharmacies, searchEvents, stockItems } from "../db/schema.js";
import { stockStatus } from "../domain/availability.js";
import { distanceKm, latLng, routeUrl } from "../domain/geo.js";
import { NotFoundError } from "../domain/errors.js";
import { isoDay } from "../domain/dates.js";
import { availableQuantity } from "./stock.js";
import { rememberMedication } from "./search-history.js";
import { toMedicationSummary, type MedicationSummary } from "./medications.js";

export interface AvailabilityItem {
    pharmacyId: string;
    pharmacyName: string;
    kind: "ubs" | "municipal_pharmacy" | "specialized_pharmacy" | "pfpb";
    isReference: boolean;
    status: "available" | "low" | "out" | "unknown";
    updatedAt: string | null;
    distanceKm: number | null;
    routeUrl: string | null;
    consultationOnly: boolean;
    openingHours: string;
    address: string;
}

export interface AvailabilityResponse {
    medication: MedicationSummary;
    foundInNetwork: boolean;
    items: AvailabilityItem[];
}

export async function medicationAvailability(
    db: Db,
    patientUserId: string,
    medicationId: string,
): Promise<AvailabilityResponse> {
    return db.transaction(async (tx) => {
        const [medication] = await tx
            .select()
            .from(medications)
            .where(eq(medications.id, medicationId));
        if (!medication) throw new NotFoundError("Medicamento não encontrado.");
        const [patient] = await tx
            .select()
            .from(patients)
            .where(eq(patients.userId, patientUserId));
        if (!patient) throw new NotFoundError("Paciente não encontrado.");

        const kinds: AvailabilityItem["kind"][] =
            medication.component === "specialized"
                ? ["specialized_pharmacy"]
                : ["ubs", "municipal_pharmacy"];
        if (medication.inFarmaciaPopular) kinds.push("pfpb");

        const units = await tx.select().from(pharmacies).where(inArray(pharmacies.kind, kinds));
        const items = await tx
            .select()
            .from(stockItems)
            .where(and(eq(stockItems.medicationId, medicationId)));
        const itemBy = new Map(items.map((i) => [i.pharmacyId, i]));
        const today = isoDay();
        const origin = latLng(patient.latitude, patient.longitude);

        const result: AvailabilityItem[] = [];
        let foundInNetwork = false;
        for (const unit of units) {
            const dest = latLng(unit.latitude, unit.longitude);
            const base = {
                pharmacyId: unit.id,
                pharmacyName: unit.name,
                kind: unit.kind,
                isReference: unit.id === patient.referencePharmacyId,
                distanceKm: distanceKm(origin, dest),
                routeUrl: routeUrl(origin, dest),
                openingHours: unit.openingHours,
                address: unit.address,
            };
            if (unit.kind === "pfpb") {
                // Farmácia Popular: sem base pública de estoque, só consulta.
                result.push({
                    ...base,
                    status: "unknown",
                    updatedAt: null,
                    consultationOnly: true,
                });
                continue;
            }
            const available = await availableQuantity(tx, unit.id, medicationId, today, {
                lock: false,
            });
            if (available > 0) foundInNetwork = true;
            const item = itemBy.get(unit.id);
            result.push({
                ...base,
                status: stockStatus(available, item?.minQuantity ?? 0),
                updatedAt: item?.updatedAt.toISOString() ?? null,
                consultationOnly: false,
            });
        }

        result.sort((a, b) => {
            if (a.isReference !== b.isReference) return a.isReference ? -1 : 1;
            if (a.distanceKm === null) return b.distanceKm === null ? 0 : 1;
            if (b.distanceKm === null) return -1;
            return a.distanceKm - b.distanceKm;
        });

        // Histórico da própria paciente (aparece só para ela no Início e na busca).
        await rememberMedication(tx, patientUserId, medicationId);

        // Demanda não atendida: sem nenhum dado do paciente além da unidade de referência.
        await tx
            .insert(searchEvents)
            .values({ medicationId, pharmacyId: patient.referencePharmacyId, foundInNetwork });

        return { medication: toMedicationSummary(medication), foundInNetwork, items: result };
    });
}

export interface NetworkItem {
    pharmacyId: string;
    pharmacyName: string;
    available: number;
}

/** Onde tem na rede pública (para a dica do balcão): sem a própria unidade, sem zeradas, maior primeiro. */
export async function networkAvailability(
    db: Db,
    excludePharmacyId: string,
    medicationId: string,
): Promise<NetworkItem[]> {
    const units = await db
        .select()
        .from(pharmacies)
        .where(inArray(pharmacies.kind, ["ubs", "municipal_pharmacy", "specialized_pharmacy"]));
    const today = isoDay();
    const items: NetworkItem[] = [];
    for (const unit of units) {
        if (unit.id === excludePharmacyId) continue;
        const available = await availableQuantity(db, unit.id, medicationId, today, {
            lock: false,
        });
        if (available > 0) items.push({ pharmacyId: unit.id, pharmacyName: unit.name, available });
    }
    return items.sort((a, b) => b.available - a.available);
}
