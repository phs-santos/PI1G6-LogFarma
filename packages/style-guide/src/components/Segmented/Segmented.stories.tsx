import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Segmented } from "./Segmented";

const meta = {
    title: "Formulário/Segmentado",
    component: Segmented,
    parameters: { mobile: true },
} satisfies Meta<typeof Segmented>;
export default meta;
type Story = StoryObj<typeof meta>;

export const QuemEstaEntrando: Story = {
    args: { label: "", options: [], value: "", onChange: () => undefined },
    render: () => {
        const [value, setValue] = useState<"paciente" | "equipe">("paciente");
        return (
            <Segmented
                label="Quem está entrando"
                value={value}
                onChange={setValue}
                options={[
                    { value: "paciente", label: "Sou paciente" },
                    {
                        value: "equipe",
                        label: "Sou da equipe",
                        hint: "Farmácia, fornecedor, entrega ou gestão",
                    },
                ]}
            />
        );
    },
};
