import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Ocupa a largura toda (pilha de botões no celular). */
    block?: boolean;
    /** Ação em andamento: desabilita e mostra "Enviando…" (evita toque duplo). */
    loading?: boolean;
}

/** Classes do botão, para um link (`<a>`) que precisa da mesma aparência. */
export function buttonClassName({
    variant = "primary",
    size = "md",
    block = false,
}: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    block?: boolean;
}): string {
    return [
        "sg-button",
        `sg-button--${variant}`,
        `sg-button--${size}`,
        block ? "sg-button--block" : "",
    ]
        .filter(Boolean)
        .join(" ");
}

export function Button({
    variant = "primary",
    size = "md",
    block = false,
    loading = false,
    className = "",
    type = "button",
    disabled,
    children,
    ...props
}: ButtonProps) {
    const classes = [buttonClassName({ variant, size, block }), className]
        .filter(Boolean)
        .join(" ");
    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...props}
        >
            {loading ? "Enviando…" : children}
        </button>
    );
}
