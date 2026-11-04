import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card";

const meta = {
    title: "Components/Card",
    component: Card,
    args: { title: "Título do card", children: "Conteúdo do card." },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutTitle: Story = { args: { title: undefined } };
