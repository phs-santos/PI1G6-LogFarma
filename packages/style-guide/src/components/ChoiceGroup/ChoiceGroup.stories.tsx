import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChoiceGroup, ChoiceOption } from "./ChoiceGroup";

const meta = {
    title: "Formulário/Escolha",
    component: ChoiceGroup,
    parameters: { mobile: true },
} satisfies Meta<typeof ChoiceGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ComoReceber: Story = {
    args: { legend: "", children: null },
    render: () => {
        const [value, setValue] = useState("delivery");
        return (
            <ChoiceGroup legend="Quando chegar, como você quer receber?">
                <ChoiceOption
                    name="f"
                    label="Buscar na farmácia"
                    checked={value === "pickup"}
                    onChange={() => setValue("pickup")}
                />
                <ChoiceOption
                    name="f"
                    label="Receber em casa"
                    checked={value === "delivery"}
                    onChange={() => setValue("delivery")}
                />
            </ChoiceGroup>
        );
    },
};
