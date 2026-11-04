import { describe, expect, it } from "vitest";
import { requestTimeline } from "./timeline";
import { requestView } from "../../../test/fixtures";

describe("requestTimeline", () => {
    it('requestTimeline do caminho de transferência + entrega marca "Chegou na UBS Centro" como atual com "desde 10:32"', () => {
        expect(requestTimeline(requestView())).toEqual([
            { label: "Pedido recebido pela UBS Centro", state: "done" },
            { label: "Pedimos o remédio à UBS Jardim São Sebastião", state: "done" },
            { label: "Chegou na UBS Centro", state: "current", detail: "desde 10:32" },
            { label: "Entrega agendada", state: "todo" },
            { label: "Saiu para entrega", state: "todo" },
            { label: "Entregue", state: "todo" },
        ]);
    });

    it("retirada direta: recebido, separado, retirado", () => {
        const steps = requestTimeline(
            requestView({
                status: "ready_for_pickup",
                fulfillment: "pickup",
                sourcePharmacy: null,
            }),
        );
        expect(steps.map((s) => [s.label, s.state])).toEqual([
            ["Pedido recebido pela UBS Centro", "done"],
            ["Separado", "current"],
            ["Retirado", "todo"],
        ]);
    });

    it("lista de espera: começa pela fila e segue até a entrega", () => {
        const steps = requestTimeline(
            requestView({ status: "waitlisted", sourcePharmacy: null, waitlistPosition: 2 }),
        );
        expect(steps.map((s) => [s.label, s.state])).toEqual([
            ["Você entrou na lista de espera", "current"],
            ["Chegou na UBS Centro", "todo"],
            ["Entrega agendada", "todo"],
            ["Saiu para entrega", "todo"],
            ["Entregue", "todo"],
        ]);
    });

    it("chegou pela fila e vai retirar: separado depois de chegar", () => {
        const steps = requestTimeline(
            requestView({
                status: "ready_for_pickup",
                fulfillment: "pickup",
                sourcePharmacy: null,
                expectedAt: "2026-11-12",
            }),
        );
        expect(steps.map((s) => s.label)).toContain("Separado");
        expect(steps.find((s) => s.state === "current")?.label).toBe("Separado");
    });

    it("cancelado termina em Pedido cancelado", () => {
        const steps = requestTimeline(requestView({ status: "cancelled", sourcePharmacy: null }));
        expect(steps.at(-1)).toMatchObject({ label: "Pedido cancelado", state: "current" });
    });
});
