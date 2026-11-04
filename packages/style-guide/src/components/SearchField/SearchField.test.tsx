import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchField, type SearchSuggestion } from "./SearchField";
import { expectNoAxeViolations } from "../../../test/setup";

const suggestions: SearchSuggestion[] = [
    { id: "los", label: "Losartana potássica 50 mg comprimido", tarja: "simple" },
    { id: "met", label: "Metformina 850 mg comprimido", tarja: "simple" },
];

function Harness({ onSelect }: { onSelect: (id: string) => void }) {
    const [value, setValue] = useState("");
    return (
        <SearchField
            label="Qual remédio você precisa?"
            value={value}
            onChange={setValue}
            suggestions={value.length >= 2 ? suggestions : []}
            onSelect={onSelect}
        />
    );
}

describe("SearchField", () => {
    it("seta para baixo ativa a primeira sugestão e Enter seleciona", async () => {
        const onSelect = vi.fn();
        render(<Harness onSelect={onSelect} />);
        const input = screen.getByRole("combobox", { name: "Qual remédio você precisa?" });
        await userEvent.type(input, "lo");
        expect(input).toHaveAttribute("aria-expanded", "true");
        await userEvent.keyboard("{ArrowDown}");
        const first = screen.getByRole("option", { name: /Losartana/ });
        expect(input).toHaveAttribute("aria-activedescendant", first.id);
        await userEvent.keyboard("{Enter}");
        expect(onSelect).toHaveBeenCalledWith("los");
    });
    it("Esc fecha a lista", async () => {
        render(<Harness onSelect={() => undefined} />);
        const input = screen.getByRole("combobox");
        await userEvent.type(input, "lo");
        await userEvent.keyboard("{Escape}");
        expect(input).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("listbox")).toBeNull();
    });
    it("clicar numa sugestão seleciona", async () => {
        const onSelect = vi.fn();
        render(<Harness onSelect={onSelect} />);
        await userEvent.type(screen.getByRole("combobox"), "me");
        await userEvent.click(screen.getByRole("option", { name: /Metformina/ }));
        expect(onSelect).toHaveBeenCalledWith("met");
    });
    it("sem violações de acessibilidade com a lista aberta", async () => {
        const { container } = render(<Harness onSelect={() => undefined} />);
        await userEvent.type(screen.getByRole("combobox"), "lo");
        await expectNoAxeViolations(container);
    });
});
