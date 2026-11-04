import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Notice } from "./Notice";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Notice", () => {
    it("live tem role status e mostra título e texto", () => {
        render(
            <Notice tone="success" title="Seu remédio chegou" live>
                A losartana já está na UBS Centro.
            </Notice>,
        );
        const region = screen.getByRole("status");
        expect(region).toHaveTextContent("Seu remédio chegou");
        expect(region).toHaveTextContent("A losartana já está na UBS Centro.");
    });
    it("sem live não é região de status", () => {
        render(<Notice tone="danger" title="Este remédio está em falta na rede" />);
        expect(screen.queryByRole("status")).toBeNull();
    });
    it("sem violações de acessibilidade", async () => {
        const { container } = render(<Notice tone="attention" title="Leve a receita" />);
        await expectNoAxeViolations(container);
    });
});
