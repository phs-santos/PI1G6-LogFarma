import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell";
import { expectNoAxeViolations } from "../../../test/setup";

function renderShell() {
    return render(
        <AppShell
            brand={<span>LogFarma</span>}
            navLabel="Menu principal"
            nav={
                <>
                    <a href="#inicio" aria-current="page">
                        Início
                    </a>
                    <a href="#pedidos">Meus pedidos</a>
                </>
            }
            footer={<button type="button">Sair</button>}
        >
            <h1>Conteúdo</h1>
        </AppShell>,
    );
}

describe("AppShell", () => {
    it("mostra o conteúdo e o menu com nome", () => {
        renderShell();
        expect(screen.getByRole("heading", { name: "Conteúdo" })).toBeInTheDocument();
        expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument();
        expect(screen.getByRole("main")).toContainElement(
            screen.getByRole("heading", { name: "Conteúdo" }),
        );
    });

    it("botão Menu abre e fecha a gaveta (celular), com aria-expanded", async () => {
        renderShell();
        const user = userEvent.setup();
        const menu = screen.getByRole("button", { name: "Menu" });
        expect(menu).toHaveAttribute("aria-expanded", "false");
        await user.click(menu);
        expect(menu).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus();
        await user.click(screen.getByRole("button", { name: "Fechar" }));
        expect(menu).toHaveAttribute("aria-expanded", "false");
        expect(menu).toHaveFocus();
    });

    it("Esc fecha a gaveta", async () => {
        renderShell();
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Menu" }));
        await user.keyboard("{Escape}");
        expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
            "aria-expanded",
            "false",
        );
    });

    it("escolher um item do menu fecha a gaveta", async () => {
        renderShell();
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Menu" }));
        await user.click(screen.getByRole("link", { name: "Meus pedidos" }));
        expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
            "aria-expanded",
            "false",
        );
    });

    it("não tem violações de acessibilidade, fechado e aberto", async () => {
        const { container } = renderShell();
        await expectNoAxeViolations(container);
        await userEvent.setup().click(screen.getByRole("button", { name: "Menu" }));
        await expectNoAxeViolations(container);
    });
});
