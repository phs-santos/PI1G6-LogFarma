import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./FilterBar";
import { TextField } from "../Fields/Fields";
import { expectNoAxeViolations } from "../../../test/setup";

describe("FilterBar", () => {
    it("é uma busca com nome, mostra o resumo e limpa os filtros", async () => {
        const onClear = vi.fn();
        const { container } = render(
            <FilterBar label="Filtrar usuários" summary="9 contas" active onClear={onClear}>
                <TextField label="Buscar" type="search" />
            </FilterBar>,
        );
        expect(screen.getByRole("search", { name: "Filtrar usuários" })).toBeInTheDocument();
        expect(screen.getByText("9 contas")).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Limpar filtros" }));
        expect(onClear).toHaveBeenCalledTimes(1);
        await expectNoAxeViolations(container);
    });

    it("sem filtro ativo não mostra Limpar filtros; Enter não recarrega a página", () => {
        render(
            <FilterBar label="Filtrar" onClear={() => undefined}>
                <TextField label="Buscar" type="search" />
            </FilterBar>,
        );
        expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
        const form = screen.getByRole("search");
        const event = new Event("submit", { cancelable: true, bubbles: true });
        form.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
    });
});
