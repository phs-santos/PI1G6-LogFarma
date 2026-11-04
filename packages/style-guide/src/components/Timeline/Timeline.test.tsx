import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "./Timeline";
import { expectNoAxeViolations } from "../../../test/setup";

const steps = [
    { label: "Pedido recebido pela UBS Centro", state: "done" as const },
    { label: "Chegou na UBS Centro", state: "current" as const, detail: "desde 10:32" },
    { label: "Entregue", state: "todo" as const },
];

describe("Timeline", () => {
    it("marca aria-current no passo atual e anuncia agora", () => {
        render(<Timeline label="Andamento do pedido" steps={steps} />);
        const current = screen.getByText("Chegou na UBS Centro").closest("li");
        expect(current).toHaveAttribute("aria-current", "step");
        expect(current).toHaveTextContent("agora");
        expect(current).toHaveTextContent("desde 10:32");
        expect(screen.getByText("Pedido recebido pela UBS Centro").closest("li")).toHaveTextContent(
            "feito",
        );
        expect(screen.getByRole("list", { name: "Andamento do pedido" }).tagName).toBe("OL");
    });
    it("sem violações de acessibilidade", async () => {
        const { container } = render(<Timeline label="Andamento" steps={steps} />);
        await expectNoAxeViolations(container);
    });
});
