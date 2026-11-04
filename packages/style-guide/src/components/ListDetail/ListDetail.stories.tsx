import type { Meta, StoryObj } from "@storybook/react-vite";
import { ListDetail } from "./ListDetail";

const meta = { title: "Computador/ListaDetalhe", component: ListDetail } satisfies Meta<
    typeof ListDetail
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Balcao: Story = {
    args: {
        listLabel: "Fila de pedidos",
        list: <p>Losartana 50 mg, 30 comprimidos</p>,
        detail: <h2>Losartana 50 mg</h2>,
    },
};
