import type { Meta, StoryObj } from "@storybook/react-vite";
import { Notice } from "./Notice";

const meta = {
    title: "Identidade/Aviso",
    component: Notice,
    args: {
        tone: "success",
        title: "Seu remédio chegou",
        children: "A losartana já está na UBS Centro.",
    },
} satisfies Meta<typeof Notice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Chegou: Story = { parameters: { mobile: true } };
export const Atencao: Story = {
    args: { tone: "attention", title: "Leve a receita", children: undefined },
};
export const EmFaltaNaRede: Story = {
    args: { tone: "danger", title: "Este remédio está em falta na rede", children: undefined },
};
export const Informacao: Story = {
    args: { tone: "info", title: "Você é a 2ª da lista", children: undefined },
};
