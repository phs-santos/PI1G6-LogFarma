import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export function Button({
    variant = "primary",
    size = "md",
    className = "",
    type = "button",
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            className={`sg-button sg-button--${variant} sg-button--${size} ${className}`.trim()}
            {...props}
        />
    );
}
