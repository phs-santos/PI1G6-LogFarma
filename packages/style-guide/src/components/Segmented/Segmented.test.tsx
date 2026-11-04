import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Segmented } from "./Segmented";
import { expectNoAxeViolations } from "../../../test/setup";

const options = [
    { value: "paciente", label: "Sou paciente" },
    { value: "equipe", label: "Sou da equipe", hint: "Farmácia, fornecedor, entrega ou gestão" },
];

describe("Segmented", () => {
    it("é um grupo de opções com uma marcada e muda ao clicar", async () => {
        const onChange = vi.fn();
        const { container } = render(
            <Segmented
                label="Quem está entrando"
                options={options}
                value="paciente"
                onChange={onChange}
            />,
        );
        const group = screen.getByRole("radiogroup", { name: "Quem está entrando" });
        expect(group).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Sou paciente" })).toBeChecked();
        await userEvent.setup().click(screen.getByRole("radio", { name: /Sou da equipe/ }));
        expect(onChange).toHaveBeenCalledWith("equipe");
        await expectNoAxeViolations(container);
    });

    it("setas do teclado trocam a opção", async () => {
        const onChange = vi.fn();
        render(
            <Segmented
                label="Quem está entrando"
                options={options}
                value="paciente"
                onChange={onChange}
            />,
        );
        const user = userEvent.setup();
        await user.click(screen.getByRole("radio", { name: "Sou paciente" }));
        await user.keyboard("{ArrowRight}");
        expect(onChange).toHaveBeenLastCalledWith("equipe");
    });
});
