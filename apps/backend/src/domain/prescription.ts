import { addDays } from "./dates.js";

export type CheckablePrescriptionType = "simple" | "antimicrobial" | "special_control";

/**
 * Validade da receita em dias, por tipo. É regra de negócio, não configuração de servidor:
 * mudou a norma (ou o município pede outro prazo), muda aqui, com teste.
 * Conferir com a norma do município (Portaria 344/98 e RDC 471/2021 para antimicrobianos).
 */
export const PRESCRIPTION_VALIDITY_DAYS = {
    /** Receita simples de uso contínuo. */
    simpleContinuous: 180,
    /** Receita simples. */
    simple: 30,
    /** Antimicrobiano (antibiótico). */
    antimicrobial: 10,
    /** Controle especial. */
    specialControl: 30,
} as const;

export type PrescriptionValidityDays = Record<keyof typeof PRESCRIPTION_VALIDITY_DAYS, number>;

/** Validade da receita pelo tipo (data `AAAA-MM-DD`). */
export function prescriptionValidUntil(
    type: CheckablePrescriptionType,
    continuousUse: boolean,
    issuedAt: string,
    days: PrescriptionValidityDays = PRESCRIPTION_VALIDITY_DAYS,
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
