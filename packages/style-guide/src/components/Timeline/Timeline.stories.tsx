import type { Meta, StoryObj } from "@storybook/react-vite";
import { Timeline } from "./Timeline";

const meta = {
    title: "Componentes/Timeline",
    component: Timeline,
    parameters: { mobile: true },
} satisfies Meta<typeof Timeline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const EntregaEmCasa: Story = {
    args: {
        label: "Andamento do pedido",
        steps: [
            { label: "Pedido recebido pela UBS Centro", state: "done" },
            { label: "Pedimos o remédio à UBS Jardim São Sebastião", state: "done" },
            { label: "Chegou na UBS Centro", state: "current", detail: "desde 10:32" },
            { label: "Entrega agendada", state: "todo" },
            { label: "Saiu para entrega", state: "todo" },
            { label: "Entregue", state: "todo" },
        ],
    },
};
