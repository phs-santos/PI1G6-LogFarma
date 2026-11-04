import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChoiceGroup, ChoiceOption } from "./ChoiceGroup";
import { expectNoAxeViolations } from "../../../test/setup";

describe("ChoiceGroup", () => {
    it("é um grupo de rádios com a pergunta como nome", async () => {
        const onChange = vi.fn();
        const { container } = render(
            <ChoiceGroup legend="Como você quer receber?">
                <ChoiceOption
                    name="f"
                    label="Buscar na farmácia"
                    checked
                    onChange={() => undefined}
                />
                <ChoiceOption
                    name="f"
                    label="Receber em casa"
                    checked={false}
                    onChange={onChange}
                />
            </ChoiceGroup>,
        );
        expect(
            screen.getByRole("radiogroup", { name: "Como você quer receber?" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Buscar na farmácia" })).toBeChecked();
        await userEvent.setup().click(screen.getByText("Receber em casa"));
        expect(onChange).toHaveBeenCalled();
        await expectNoAxeViolations(container);
    });
});
