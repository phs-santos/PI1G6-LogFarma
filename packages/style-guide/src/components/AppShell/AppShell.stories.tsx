import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppShell } from "./AppShell";
import { Button } from "../Button/Button";
import { Logo } from "../Logo/Logo";

const meta = {
    title: "Moldura/Menu lateral",
    component: AppShell,
    parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppShell>;
export default meta;
type Story = StoryObj<typeof meta>;

const nav = (
    <>
        <a href="#inicio" aria-current="page">
            Início
        </a>
        <a href="#buscar">Buscar medicamento</a>
        <a href="#pedidos">Meus pedidos</a>
        <a href="#avisos">Avisos</a>
        <a href="#dados">Meus dados</a>
    </>
);

export const Paciente: Story = {
    args: {
        brand: <Logo tone="white" />,
        nav,
        footer: <Button variant="secondary">Sair</Button>,
        children: (
            <div style={{ padding: "var(--space-6)" }}>
                <h1>Olá, Maria</h1>
                <p>Reduza a largura da janela para ver o botão Menu.</p>
            </div>
        ),
    },
};
