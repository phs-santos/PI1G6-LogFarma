import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable } from "./DataTable";
import { expectNoAxeViolations } from "../../../test/setup";

interface Row {
    id: string;
    name: string;
    qty: number;
}
const columns = [
    { key: "name", header: "Remédio", render: (r: Row) => r.name },
    { key: "qty", header: "Quantidade", render: (r: Row) => r.qty },
];

describe("DataTable", () => {
    it("mostra emptyText sem linhas", () => {
        render(
            <DataTable
                caption="Lotes"
                columns={columns}
                rows={[]}
                rowKey={(r) => r.id}
                emptyText="Nenhum lote."
            />,
        );
        expect(screen.getByText("Nenhum lote.")).toBeInTheDocument();
    });
    it("tabela com legenda e cabeçalhos", async () => {
        const { container } = render(
            <DataTable
                caption="Lotes"
                columns={columns}
                rows={[{ id: "1", name: "Dipirona", qty: 80 }]}
                rowKey={(r) => r.id}
                emptyText="-"
            />,
        );
        expect(screen.getByRole("table", { name: "Lotes" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Quantidade" })).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });
});
