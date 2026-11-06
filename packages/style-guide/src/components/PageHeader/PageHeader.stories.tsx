import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageHeader } from "./PageHeader";
import { Button } from "../Button/Button";

const meta = { title: "Moldura/Cabeçalho da tela", component: PageHeader } satisfies Meta<
    typeof PageHeader
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ComAcao: Story = {
    args: {
        title: "Usuários",
        description: "Contas de quem trabalha na rede. Pacientes não aparecem aqui.",
        actions: <Button>Criar conta</Button>,
    },
};

export const SoTitulo: Story = { args: { title: "Pedidos" } };
