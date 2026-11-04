import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    title?: ReactNode;
}

export function Card({ title, children, className = "", ...props }: CardProps) {
    return (
        <div className={`sg-card ${className}`.trim()} {...props}>
            {title && <h3 className="sg-card__title">{title}</h3>}
            {children}
        </div>
    );
}
