import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataTable } from "./DataTable";

interface Row {
    id: string;
    med: string;
    unit: string;
    expiry: string;
}
const meta = { title: "Computador/Tabela", component: DataTable<Row> } satisfies Meta<
    typeof DataTable<Row>
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const LotesVencendo: Story = {
    args: {
        caption: "Lotes perto de vencer",
        rowKey: (r: Row) => r.id,
        emptyText: "Nenhum lote vence nos próximos 60 dias.",
        columns: [
            { key: "med", header: "Remédio", render: (r: Row) => r.med },
            { key: "unit", header: "Unidade", render: (r: Row) => r.unit },
            { key: "expiry", header: "Vence em", render: (r: Row) => r.expiry },
        ],
        rows: [
            { id: "1", med: "Dipirona 500 mg", unit: "UBS Centro", expiry: "30 dias" },
            {
                id: "2",
                med: "Losartana 50 mg",
                unit: "UBS Jardim São Sebastião",
                expiry: "45 dias",
            },
        ],
    },
};
