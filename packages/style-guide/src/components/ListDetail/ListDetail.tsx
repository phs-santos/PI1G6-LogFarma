import type { ReactNode } from "react";

export interface ListDetailProps {
    listLabel: string;
    list: ReactNode;
    detail: ReactNode;
}

/** Lista à esquerda e detalhe à direita (empilha em telas estreitas). */
export function ListDetail({ listLabel, list, detail }: ListDetailProps) {
    return (
        <div className="sg-list-detail">
            <section className="sg-list-detail__list" aria-label={listLabel}>
                {list}
            </section>
            <div className="sg-list-detail__detail">{detail}</div>
        </div>
    );
}
