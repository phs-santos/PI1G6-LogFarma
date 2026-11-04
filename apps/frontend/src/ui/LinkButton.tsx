import type { ReactNode } from "react";
import { Link } from "react-router";
import type { ButtonVariant } from "@fatec-pi/style-guide";

interface Props {
    to: string;
    variant?: ButtonVariant;
    children: ReactNode;
    /** Endereço fora do app (mapa): abre em outra aba. */
    external?: boolean;
}

/** Navegação com cara de botão grande (o elemento continua sendo um link). */
export function LinkButton({ to, variant = "primary", children, external = false }: Props) {
    const className = `sg-button sg-button--${variant} sg-button--lg sg-button--block app-link-button`;
    if (external) {
        return (
            <a className={className} href={to} target="_blank" rel="noopener noreferrer">
                {children}
            </a>
        );
    }
    return (
        <Link className={className} to={to}>
            {children}
        </Link>
    );
}
