import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilterBar } from "./FilterBar";
import { SelectField, TextField } from "../Fields/Fields";

const meta = { title: "Listas/Filtros", component: FilterBar } satisfies Meta<typeof FilterBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Usuarios: Story = {
    args: {
        label: "Filtrar usuários",
        summary: "9 contas",
        active: true,
        onClear: () => undefined,
        children: (
            <>
                <TextField label="Buscar" type="search" placeholder="Nome ou e-mail" />
                <SelectField
                    label="Perfil"
                    options={[
                        { value: "", label: "Todos" },
                        { value: "courier", label: "Entregador" },
                    ]}
                />
                <SelectField
                    label="Situação"
                    options={[
                        { value: "", label: "Todas" },
                        { value: "active", label: "Ativas" },
                    ]}
                />
            </>
        ),
    },
};
