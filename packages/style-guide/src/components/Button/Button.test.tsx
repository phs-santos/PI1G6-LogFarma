import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Button", () => {
    it("loading fica desabilitado, com aria-busy e texto Enviando…", () => {
        render(<Button loading>Confirmar pedido</Button>);
        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("aria-busy", "true");
        expect(button).toHaveTextContent("Enviando…");
    });

    it("block ocupa a largura toda e danger tem classe própria", () => {
        render(
            <Button block variant="danger">
                Cancelar pedido
            </Button>,
        );
        const button = screen.getByRole("button", { name: "Cancelar pedido" });
        expect(button.className).toContain("sg-button--block");
        expect(button.className).toContain("sg-button--danger");
    });

    it("não tem violações de acessibilidade", async () => {
        const { container } = render(<Button>Procurar remédio</Button>);
        await expectNoAxeViolations(container);
    });
});
