import type { ReactNode } from "react";
import { Link } from "react-router";
import type { ButtonSize, ButtonVariant } from "@fatec-pi/style-guide";

interface Props {
    to: string;
    variant?: ButtonVariant;
    children: ReactNode;
    /** Endereço fora do app (mapa): abre em outra aba. */
    external?: boolean;
    /** Celular: grande e na largura toda (padrão). Computador: `size="md" block={false}`. */
    size?: ButtonSize;
    block?: boolean;
}

/** Navegação com cara de botão grande (o elemento continua sendo um link). */
export function LinkButton({
    to,
    variant = "primary",
    children,
    external = false,
    size = "lg",
    block = true,
}: Props) {
    const className = [
        "sg-button",
        `sg-button--${variant}`,
        `sg-button--${size}`,
        block ? "sg-button--block" : "",
        "app-link-button",
    ]
        .filter(Boolean)
        .join(" ");
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
