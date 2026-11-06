import type { PharmacyView } from "../../api/types";

export const KIND_TEXT: Record<PharmacyView["kind"], string> = {
    ubs: "UBS",
    municipal_pharmacy: "Farmácia municipal",
    specialized_pharmacy: "Farmácia de especializados",
    pfpb: "Farmácia Popular",
};

export const NETWORK_TEXT: Record<PharmacyView["network"], string> = {
    municipal: "Municipal",
    state: "Estadual",
    pfpb: "Farmácia Popular",
};
