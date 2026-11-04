import type { Env } from "../env.js";
import { addDays } from "./dates.js";

export type CheckablePrescriptionType = "simple" | "antimicrobial" | "special_control";

/** Validade da receita pelo tipo. Prazos vêm do ambiente (conferir com a norma do município). */
export function prescriptionValidUntil(
    type: CheckablePrescriptionType,
    continuousUse: boolean,
    issuedAt: string,
    days: Env["prescriptionDays"],
): string {
    const amount =
        type === "antimicrobial"
            ? days.antimicrobial
            : type === "special_control"
              ? days.specialControl
              : continuousUse
                ? days.simpleContinuous
                : days.simple;
    return addDays(issuedAt, amount);
}
