import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox, SelectField, TextField } from "./Fields";

const meta = {
    title: "Formulário/Campos",
    component: TextField,
    args: { label: "Cartão SUS" },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Texto: Story = {
    args: { hint: "Os 15 números do cartão" },
    parameters: { mobile: true },
};
export const ComErro: Story = {
    args: { error: "Digite os 15 números do cartão." },
    parameters: { mobile: true },
};
export const Data: Story = { args: { label: "Data de nascimento", type: "date" } };
export const Selecao: Story = {
    render: () => (
        <SelectField
            label="Sua unidade"
            options={[
                { value: "c", label: "UBS Centro" },
                { value: "j", label: "UBS Jardim São Sebastião" },
            ]}
        />
    ),
};
export const Marcar: Story = {
    render: () => <Checkbox label="Tenho dificuldade para me locomover" />,
};
