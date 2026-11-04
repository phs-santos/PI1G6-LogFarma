import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tarja } from "./Tarja";

const meta = {
    title: "Identidade/Tarja",
    component: Tarja,
    args: { type: "simple" },
} satisfies Meta<typeof Tarja>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SemReceita: Story = { args: { type: "none" } };
export const ReceitaSimples: Story = { args: { type: "simple" } };
export const Antimicrobiano: Story = { args: { type: "antimicrobial" } };
export const ControleEspecial: Story = { args: { type: "special_control" } };
