import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs } from "./Tabs";

const meta = { title: "Computador/Abas", component: Tabs } satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Farmacia: Story = {
    args: {
        label: "Áreas da farmácia",
        activeId: "pedidos",
        onSelect: () => undefined,
        items: [
            { id: "pedidos", label: "Pedidos", count: 2 },
            { id: "transferencias", label: "Transferências", count: 1 },
            { id: "compras", label: "Compras" },
            { id: "estoque", label: "Estoque" },
            { id: "entregas", label: "Entregas" },
        ],
    },
};
