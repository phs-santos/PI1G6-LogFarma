import type { NetworkItem, PharmacyRequestItem, StaffOccupation } from "../../api/types";

export type ActionKey =
    | "register_prescription"
    | "check_prescription"
    | "prepare"
    | "dispense"
    | "schedule_delivery"
    | "request_transfer"
    | "order_from_supplier";

export interface NextStep {
    /** O botão principal (o que a farmácia deve fazer agora). */
    primary: ActionKey | null;
    others: ActionKey[];
    /** Por que não há botão principal ("Só o farmacêutico"). */
    blocked?: string;
    /** Unidade de onde pedir, quando a sugestão é transferência. */
    transferFrom: NetworkItem | null;
}

const NEEDS_RX: ActionKey[] = ["dispense", "schedule_delivery"];

/**
 * Próximo passo sugerido no balcão (RF01–RF08), seguindo as regras da API:
 * receita conferida antes de entregar; antimicrobiano e controlado só com farmacêutico.
 */
export function nextStep(
    item: PharmacyRequestItem,
    network: NetworkItem[],
    occupation: StaffOccupation,
    ownAvailable: number,
): NextStep {
    const r = item.request;
    const transferFrom = network.find((n) => n.available >= r.quantity) ?? null;
    const delivery = r.fulfillment === "delivery";
    const hasOwn = ownAvailable >= r.quantity;

    let flow: ActionKey[] = [];
    switch (r.status) {
        case "requested":
            flow = hasOwn
                ? ["prepare"]
                : transferFrom
                  ? ["request_transfer"]
                  : ["order_from_supplier"];
            break;
        case "waitlisted":
            flow = hasOwn ? ["prepare"] : [];
            break;
        case "arrived":
            flow = delivery ? ["schedule_delivery", "prepare"] : ["prepare"];
            break;
        case "ready_for_pickup":
            flow = delivery ? ["schedule_delivery", "dispense"] : ["dispense", "schedule_delivery"];
            break;
        default:
            return { primary: null, others: [], transferFrom: null };
    }

    const type = r.medication.prescriptionType;
    const restricted = type === "antimicrobial" || type === "special_control";
    const onlyPharmacist = restricted && occupation !== "pharmacist";
    if (onlyPharmacist) flow = flow.filter((a) => !NEEDS_RX.includes(a));

    const rxGate: ActionKey | null =
        type === "none"
            ? null
            : !r.prescription
              ? "register_prescription"
              : !r.prescription.checked
                ? "check_prescription"
                : null;

    if (rxGate) {
        if (onlyPharmacist)
            return { primary: null, others: flow, blocked: "Só o farmacêutico", transferFrom };
        return { primary: rxGate, others: flow, transferFrom };
    }
    const [primary = null, ...others] = flow;
    if (!primary && onlyPharmacist)
        return { primary, others, blocked: "Só o farmacêutico", transferFrom };
    return { primary, others, transferFrom };
}
