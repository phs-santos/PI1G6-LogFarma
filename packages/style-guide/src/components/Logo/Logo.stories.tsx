import type { Meta, StoryObj } from "@storybook/react-vite";
import { Logo, LogoSymbol } from "./Logo";

const meta = { title: "Marca/Logo", component: Logo } satisfies Meta<typeof Logo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Colorido: Story = { args: { tone: "ink" } };
export const SobreAzul: Story = {
    args: { tone: "white" },
    decorators: [
        (S) => (
            <div style={{ background: "var(--color-ink)", padding: "var(--space-6)" }}>
                <S />
            </div>
        ),
    ],
};
export const SoOSimbolo: Story = {
    args: {},
    render: () => (
        <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "end" }}>
            <LogoSymbol className="story-128" />
            <span style={{ fontSize: "2rem" }}>
                <LogoSymbol />
            </span>
            <LogoSymbol />
        </div>
    ),
};
