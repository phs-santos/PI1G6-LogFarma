import type { AvailabilityItem, AvailabilityResponse } from "../../api/types";

export interface Recommendation {
    /** A unidade de referência da paciente (pode não estar na lista: remédio especializado). */
    reference: AvailabilityItem | null;
    /** A mais próxima que tem, fora a dela e a Farmácia Popular (que é só consulta). */
    best: AvailabilityItem | null;
    noneInNetwork: boolean;
}

export function hasIt(item: AvailabilityItem): boolean {
    return item.status === "available" || item.status === "low";
}

/** RF03: a lista da API já vem com a dela primeiro e as outras por distância. */
export function pickRecommendation(resp: AvailabilityResponse): Recommendation {
    const reference = resp.items.find((i) => i.isReference && !i.consultationOnly) ?? null;
    const best = resp.items.find((i) => !i.isReference && !i.consultationOnly && hasIt(i)) ?? null;
    return { reference, best, noneInNetwork: !resp.foundInNetwork };
}
