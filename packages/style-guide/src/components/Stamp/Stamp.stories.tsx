import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stamp } from "./Stamp";

const meta = {
    title: "Identidade/Carimbo",
    component: Stamp,
    args: { tone: "ok", children: "Tem" },
} satisfies Meta<typeof Stamp>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tem: Story = {};
export const EmFalta: Story = { args: { tone: "danger", children: "Em falta" } };
export const SoConsulta: Story = { args: { tone: "neutral", children: "Só consulta" } };
