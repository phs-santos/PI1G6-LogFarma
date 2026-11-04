import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState, ErrorState, Spinner } from "./States";

const meta = { title: "Componentes/Estados", component: EmptyState } satisfies Meta<
    typeof EmptyState
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Vazio: Story = {
    args: {
        title: "Nenhum pedido ainda",
        children: "Quando você pedir um remédio, ele aparece aqui.",
    },
};
export const Erro: Story = {
    args: { title: "" },
    render: () => (
        <ErrorState
            message="Não foi possível carregar seus pedidos. Verifique a internet."
            onRetry={() => undefined}
        />
    ),
};
export const Carregando: Story = { args: { title: "" }, render: () => <Spinner /> };
