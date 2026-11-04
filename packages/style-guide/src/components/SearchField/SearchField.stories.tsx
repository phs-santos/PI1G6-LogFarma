import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchField } from "./SearchField";

const meta = {
    title: "Formulário/Busca",
    component: SearchField,
    parameters: { mobile: true },
} satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ProcurarRemedio: Story = {
    args: {
        label: "",
        value: "",
        onChange: () => undefined,
        suggestions: [],
        onSelect: () => undefined,
    },
    render: () => {
        const [value, setValue] = useState("lo");
        return (
            <SearchField
                label="Qual remédio você precisa?"
                value={value}
                onChange={setValue}
                onSelect={() => undefined}
                suggestions={
                    value.length >= 2
                        ? [
                              {
                                  id: "1",
                                  label: "Losartana potássica 50 mg comprimido",
                                  tarja: "simple",
                              },
                              {
                                  id: "2",
                                  label: "Dipirona monoidratada 500 mg comprimido",
                                  tarja: "none",
                              },
                          ]
                        : []
                }
            />
        );
    },
};
