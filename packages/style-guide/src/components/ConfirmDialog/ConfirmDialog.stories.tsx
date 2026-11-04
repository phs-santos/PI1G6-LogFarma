import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConfirmDialog } from "./ConfirmDialog";

const meta = {
    title: "Ações/Confirmar",
    component: ConfirmDialog,
    parameters: { mobile: true },
} satisfies Meta<typeof ConfirmDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CancelarPedido: Story = {
    args: {
        open: true,
        title: "Cancelar este pedido?",
        confirmLabel: "Sim, cancelar o pedido",
        cancelLabel: "Não, manter o pedido",
        danger: true,
        onConfirm: () => undefined,
        onClose: () => undefined,
        children: <p>Se precisar do remédio depois, faça um pedido novo.</p>,
    },
};
