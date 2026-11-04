// RF06 — prioridade da lista de espera: clínica (com consentimento) e legal por idade (Estatuto da Pessoa Idosa).
import type { PriorityCategory } from "../contracts.js";
import { ageOn, isoDay } from "./dates.js";

export function computePriority(
    input: { category: PriorityCategory | null; birthDate: string },
    today: Date,
): number {
    if (input.category === "oncology" || input.category === "rare_disease") return 400;
    if (input.category === "chronic") return 300;
    const age = ageOn(input.birthDate, isoDay(today));
    if (age >= 80) return 200;
    if (age >= 60) return 100;
    return 0;
}

/** Maior prioridade primeiro; empate pela chegada mais antiga. */
export function compareWaitlist(
    a: { priority: number; createdAt: Date },
    b: { priority: number; createdAt: Date },
): number {
    return b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime();
}
