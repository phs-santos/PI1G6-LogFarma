import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppHeader } from "./AppHeader";
import { Button } from "../Button/Button";

const meta = { title: "Computador/Topo", component: AppHeader } satisfies Meta<typeof AppHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Farmacia: Story = {
    args: {
        title: "UBS Centro",
        subtitle: "Ana Beatriz Rocha, farmacêutica",
        actions: <Button variant="secondary">Sair</Button>,
    },
};
