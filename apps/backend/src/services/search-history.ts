import { desc, eq, inArray } from "drizzle-orm";
import type { DbOrTx } from "../db/client.js";
import { medications, patientRecentMedications } from "../db/schema.js";
import { toMedicationSummary, type MedicationSummary } from "./medications.js";

const KEEP = 8;

export interface RecentMedication {
    medication: MedicationSummary;
    viewedAt: string;
}

/** Guarda que a paciente consultou o remédio (o mesmo remédio só sobe para o topo). */
export async function rememberMedication(
    db: DbOrTx,
    patientId: string,
    medicationId: string,
): Promise<void> {
    await db
        .insert(patientRecentMedications)
        .values({ patientId, medicationId, viewedAt: new Date() })
        .onConflictDoUpdate({
            target: [patientRecentMedications.patientId, patientRecentMedications.medicationId],
            set: { viewedAt: new Date() },
        });
}

/** Os últimos remédios consultados pela paciente, o mais recente primeiro. */
export async function listRecentMedications(
    db: DbOrTx,
    patientId: string,
): Promise<RecentMedication[]> {
    const rows = await db
        .select()
        .from(patientRecentMedications)
        .where(eq(patientRecentMedications.patientId, patientId))
        .orderBy(desc(patientRecentMedications.viewedAt))
        .limit(KEEP);
    if (rows.length === 0) return [];
    const meds = await db
        .select()
        .from(medications)
        .where(
            inArray(
                medications.id,
                rows.map((r) => r.medicationId),
            ),
        );
    return rows.flatMap((r) => {
        const m = meds.find((x) => x.id === r.medicationId);
        return m
            ? [{ medication: toMedicationSummary(m), viewedAt: r.viewedAt.toISOString() }]
            : [];
    });
}

/** LGPD: a paciente apaga o próprio histórico quando quiser. */
export async function clearRecentMedications(db: DbOrTx, patientId: string): Promise<void> {
    await db
        .delete(patientRecentMedications)
        .where(eq(patientRecentMedications.patientId, patientId));
}
