import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog } from "./Dialog";
import { Button } from "../Button/Button";
import { TextField } from "../Fields/Fields";

const meta = { title: "Feedback/Janela de formulário", component: Dialog } satisfies Meta<
    typeof Dialog
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CriarConta: Story = {
    args: {
        open: true,
        title: "Criar conta",
        onClose: () => undefined,
        children: (
            <form>
                <TextField label="Nome completo" />
                <TextField label="E-mail" type="email" />
                <Button type="submit">Criar conta</Button>
            </form>
        ),
    },
};

export const Larga: Story = {
    args: { ...CriarConta.args, title: "Cadastrar medicamento", size: "wide" },
};

export const MuitoLarga: Story = {
    args: { ...CriarConta.args, title: "Cadastrar medicamento", size: "xl" },
};
