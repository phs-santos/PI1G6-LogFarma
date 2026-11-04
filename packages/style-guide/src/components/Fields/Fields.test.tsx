import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Checkbox, SelectField, TextField } from "./Fields";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Campos", () => {
    it("TextField com erro liga aria-describedby e aria-invalid", () => {
        render(
            <TextField
                label="Cartão SUS"
                hint="15 números"
                error="Digite os 15 números do cartão."
            />,
        );
        const input = screen.getByLabelText("Cartão SUS");
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription("15 números Digite os 15 números do cartão.");
    });
    it("SelectField e Checkbox têm rótulo", () => {
        render(
            <>
                <SelectField label="Unidade" options={[{ value: "a", label: "UBS Centro" }]} />
                <Checkbox label="Tenho dificuldade para me locomover" />
            </>,
        );
        expect(screen.getByLabelText("Unidade")).toBeInTheDocument();
        expect(
            screen.getByRole("checkbox", { name: "Tenho dificuldade para me locomover" }),
        ).toBeInTheDocument();
    });
    it("sem violações de acessibilidade", async () => {
        const { container } = render(
            <form>
                <TextField label="Telefone" type="tel" />
                <TextField label="Data de nascimento" type="date" error="Informe a data." />
                <SelectField label="Unidade" options={[{ value: "a", label: "UBS Centro" }]} />
                <Checkbox label="Uso contínuo" hint="Remédio que você toma todo mês" />
            </form>,
        );
        await expectNoAxeViolations(container);
    });
});
