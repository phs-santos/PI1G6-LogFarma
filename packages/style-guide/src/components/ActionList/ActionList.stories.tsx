import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActionList } from "./ActionList";
import { Button } from "../Button/Button";

const meta = {
    title: "Componentes/ActionList",
    component: ActionList,
    parameters: { mobile: true },
} satisfies Meta<typeof ActionList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InicioDaPaciente: Story = {
    args: {
        label: "O que você quer fazer",
        children: [
            <Button key="a" size="lg">
                Procurar remédio
            </Button>,
            <Button key="b" size="lg" variant="secondary">
                Meus pedidos
            </Button>,
            <Button key="c" size="lg" variant="secondary">
                Avisos (2)
            </Button>,
        ],
    },
};
