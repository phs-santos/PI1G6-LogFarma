import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./Dialog";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Dialog", () => {
    it("aberto mostra título e conteúdo; fechado não mostra", () => {
        const { rerender } = render(
            <Dialog open title="Criar conta" onClose={() => undefined}>
                <p>Formulário</p>
            </Dialog>,
        );
        expect(screen.getByRole("dialog", { name: "Criar conta" })).toBeInTheDocument();
        expect(screen.getByText("Formulário")).toBeInTheDocument();
        rerender(
            <Dialog open={false} title="Criar conta" onClose={() => undefined}>
                <p>Formulário</p>
            </Dialog>,
        );
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Fechar e Esc chamam onClose", async () => {
        const onClose = vi.fn();
        render(
            <Dialog open title="Cadastrar medicamento" onClose={onClose}>
                <p>Conteúdo</p>
            </Dialog>,
        );
        await userEvent.setup().click(screen.getByRole("button", { name: "Fechar" }));
        fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("não tem violações de acessibilidade", async () => {
        const { container } = render(
            <Dialog open title="Criar conta" onClose={() => undefined}>
                <label>
                    Nome <input />
                </label>
            </Dialog>,
        );
        await expectNoAxeViolations(container);
    });

    it("clique no fundo (fora da janela) fecha; clique dentro não", async () => {
        const onClose = vi.fn();
        render(
            <Dialog open title="Criar conta" onClose={onClose}>
                <p>Conteúdo</p>
            </Dialog>,
        );
        const user = userEvent.setup();
        await user.click(screen.getByText("Conteúdo"));
        expect(onClose).not.toHaveBeenCalled();
        await user.click(screen.getByRole("dialog"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("aberto trava a rolagem da página; fechado devolve", () => {
        const { rerender } = render(
            <Dialog open title="Criar conta" onClose={() => undefined}>
                <p>x</p>
            </Dialog>,
        );
        expect(document.documentElement.style.overflow).toBe("hidden");
        rerender(
            <Dialog open={false} title="Criar conta" onClose={() => undefined}>
                <p>x</p>
            </Dialog>,
        );
        expect(document.documentElement.style.overflow).toBe("");
    });
});
