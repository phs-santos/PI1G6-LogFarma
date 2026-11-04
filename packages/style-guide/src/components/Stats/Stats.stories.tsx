import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarList, StatTile } from "./Stats";

const meta = {
    title: "Computador/Números",
    component: StatTile,
    args: { value: 23, label: "Buscas sem estoque (7 dias)" },
} satisfies Meta<typeof StatTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Numero: Story = {};
export const Barras: Story = {
    render: () => (
        <BarList
            label="Remédios mais procurados sem estoque"
            items={[
                { label: "Adalimumabe", value: 11 },
                { label: "Clonazepam", value: 4 },
                { label: "Insulina NPH", value: 2 },
            ]}
        />
    ),
};
