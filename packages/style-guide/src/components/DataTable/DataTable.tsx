import type { ReactNode } from "react";

export interface DataColumn<T> {
    key: string;
    header: string;
    render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
    caption: string;
    columns: DataColumn<T>[];
    rows: T[];
    rowKey: (row: T) => string;
    emptyText: string;
}

/** Tabela simples com legenda (estoque, compras, gestor). */
export function DataTable<T>({ caption, columns, rows, rowKey, emptyText }: DataTableProps<T>) {
    if (rows.length === 0) {
        return (
            <section className="sg-table-empty" aria-label={caption}>
                <p className="sg-table__caption">{caption}</p>
                <p>{emptyText}</p>
            </section>
        );
    }
    return (
        <table className="sg-table">
            <caption className="sg-table__caption">{caption}</caption>
            <thead>
                <tr>
                    {columns.map((c) => (
                        <th key={c.key} scope="col">
                            {c.header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={rowKey(row)}>
                        {columns.map((c) => (
                            <td key={c.key}>{c.render(row)}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
