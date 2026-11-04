import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
    title?: ReactNode;
}

/** Bloco de conteúdo separado pela pauta da receita (sem sombra). */
export function Card({ title, children, className = "", ...props }: CardProps) {
    return (
        <section className={`sg-card ${className}`.trim()} {...props}>
            {title && <h2 className="sg-card__title">{title}</h2>}
            {children}
        </section>
    );
}
