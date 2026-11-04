import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
    title: "Components/Button",
    component: Button,
    args: { children: "Botão" },
    argTypes: {
        variant: { control: "inline-radio", options: ["primary", "secondary", "danger", "ghost"] },
        size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Disabled: Story = { args: { disabled: true } };
export const Danger: Story = { args: { variant: "danger", children: "Cancelar pedido" } };
export const Enviando: Story = { args: { loading: true, children: "Confirmar pedido" } };
export const CelularEmBloco: Story = {
    args: { block: true, size: "lg", children: "Procurar remédio" },
    parameters: { mobile: true },
};
