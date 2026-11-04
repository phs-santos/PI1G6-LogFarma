import type { ReactNode } from "react";

export interface ActionListProps {
    label: string;
    children: ReactNode;
}

/** Pilha de botões grandes (início da paciente, entregador). */
export function ActionList({ label, children }: ActionListProps) {
    return (
        <nav className="sg-action-list" aria-label={label}>
            {children}
        </nav>
    );
}
