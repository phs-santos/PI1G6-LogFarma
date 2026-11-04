import type { TimelineStep } from "@fatec-pi/style-guide";
import type { RequestStatus, RequestView } from "../../api/types";
import { formatTime } from "../../lib/dates";

/** Ordem das situações no caminho do pedido (situações paralelas têm o mesmo número). */
const RANK: Record<Exclude<RequestStatus, "cancelled">, number> = {
    requested: 0,
    in_transfer: 1,
    waitlisted: 1,
    arrived: 2,
    ready_for_pickup: 3,
    delivery_scheduled: 4,
    out_for_delivery: 5,
    picked_up: 6,
    delivered: 6,
};

interface Draft {
    label: string;
    rank: number;
}

/**
 * Linha do tempo em linguagem da paciente: um passo por situação, o atual destacado
 * e o horário só no passo atual ("desde 10:32").
 */
export function requestTimeline(view: RequestView): TimelineStep[] {
    const unit = view.pharmacy.name;
    const received: Draft = { label: `Pedido recebido pela ${unit}`, rank: RANK.requested };
    const arrived: Draft = { label: `Chegou na ${unit}`, rank: RANK.arrived };

    if (view.status === "cancelled") {
        return [
            { label: received.label, state: "done" },
            {
                label: "Pedido cancelado",
                state: "current",
                detail: `desde ${formatTime(view.updatedAt)}`,
            },
        ];
    }

    // Transferência deixa a unidade de origem gravada; chegada sem origem só vem da fila de espera.
    const viaTransfer = view.sourcePharmacy !== null || view.status === "in_transfer";
    const viaWaitlist =
        !viaTransfer &&
        (view.status === "waitlisted" ||
            view.waitlistPosition !== null ||
            view.expectedAt !== null ||
            view.status === "arrived");

    const start: Draft[] = viaTransfer
        ? [
              received,
              {
                  label: `Pedimos o remédio à ${view.sourcePharmacy?.name ?? "outra unidade"}`,
                  rank: RANK.in_transfer,
              },
              arrived,
          ]
        : viaWaitlist
          ? [{ label: "Você entrou na lista de espera", rank: RANK.waitlisted }, arrived]
          : [received];

    const arrives = viaTransfer || viaWaitlist;
    const end: Draft[] =
        view.fulfillment === "pickup"
            ? [
                  { label: "Separado", rank: RANK.ready_for_pickup },
                  { label: "Retirado", rank: RANK.picked_up },
              ]
            : [
                  ...(arrives ? [] : [{ label: "Separado", rank: RANK.ready_for_pickup }]),
                  { label: "Entrega agendada", rank: RANK.delivery_scheduled },
                  { label: "Saiu para entrega", rank: RANK.out_for_delivery },
                  { label: "Entregue", rank: RANK.delivered },
              ];

    const drafts = [...start, ...end];
    const rank = RANK[view.status];
    let current = 0;
    drafts.forEach((d, i) => {
        if (d.rank <= rank) current = i;
    });
    return drafts.map((d, i) =>
        i < current
            ? { label: d.label, state: "done" }
            : i === current
              ? { label: d.label, state: "current", detail: `desde ${formatTime(view.updatedAt)}` }
              : { label: d.label, state: "todo" },
    );
}
