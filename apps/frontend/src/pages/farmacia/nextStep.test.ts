import { describe, expect, it } from "vitest";
import { nextStep } from "./nextStep";
import { amoxicilina, networkCena2, pharmacyItem } from "../../../test/fixtures";

describe("nextStep", () => {
    it('nextStep sugere "Pedir à UBS Jardim" sem estoque próprio e com rede', () => {
        const s = nextStep(pharmacyItem(), networkCena2, "pharmacist", 0);
        expect(s.primary).toBe("request_transfer");
        expect(s.transferFrom?.pharmacyName).toBe("UBS Jardim São Sebastião");
        expect(s.others).not.toContain("prepare");
    });

    it("com estoque próprio sugere Separar", () => {
        expect(nextStep(pharmacyItem(), networkCena2, "pharmacist", 200).primary).toBe("prepare");
    });

    it("nextStep sugere fornecedor quando a rede está vazia", () => {
        const s = nextStep(pharmacyItem(), [], "pharmacist", 0);
        expect(s.primary).toBe("order_from_supplier");
        expect(s.transferFrom).toBeNull();
    });

    it('nextStep bloqueia conferir antimicrobiano para auxiliar com "Só o farmacêutico"', () => {
        const item = pharmacyItem({
            medication: amoxicilina,
            prescription: {
                id: "rx-2",
                type: "antimicrobial",
                issuedAt: "2026-11-01",
                validUntil: "2026-11-11",
                prescriberName: "Dr. Paulo Lima",
                checked: false,
            },
        });
        const s = nextStep(item, [], "pharmacy_assistant", 100);
        expect(s.primary).toBeNull();
        expect(s.blocked).toBe("Só o farmacêutico");
        expect(nextStep(item, [], "pharmacist", 100).primary).toBe("check_prescription");
    });

    it("sem receita registrada pede para registrar", () => {
        const s = nextStep(pharmacyItem({ prescription: null }), [], "pharmacist", 100);
        expect(s.primary).toBe("register_prescription");
    });

    it("separado para entrega sugere agendar; para retirada, entregar no balcão", () => {
        expect(
            nextStep(pharmacyItem({ status: "ready_for_pickup" }), [], "pharmacist", 0).primary,
        ).toBe("schedule_delivery");
        expect(
            nextStep(
                pharmacyItem({ status: "ready_for_pickup", fulfillment: "pickup" }),
                [],
                "pharmacist",
                0,
            ).primary,
        ).toBe("dispense");
    });

    it("chegou por transferência para entrega: agendar", () => {
        expect(nextStep(pharmacyItem({ status: "arrived" }), [], "pharmacist", 0).primary).toBe(
            "schedule_delivery",
        );
    });

    it("pedido já em entrega ou finalizado não tem ação", () => {
        for (const status of [
            "out_for_delivery",
            "delivered",
            "picked_up",
            "cancelled",
            "in_transfer",
        ] as const) {
            expect(nextStep(pharmacyItem({ status }), [], "pharmacist", 100)).toMatchObject({
                primary: null,
                others: [],
            });
        }
    });
});
