import type { ReactNode } from "react";
import { Button } from "../Button/Button";

export interface EmptyStateProps {
    title: string;
    children?: ReactNode;
    action?: ReactNode;
}

/** Tela vazia: convida a agir. */
export function EmptyState({ title, children, action }: EmptyStateProps) {
    return (
        <div className="sg-state">
            <p className="sg-state__title">{title}</p>
            {children && <div>{children}</div>}
            {action && <div className="sg-state__action">{action}</div>}
        </div>
    );
}

export interface ErrorStateProps {
    message: string;
    onRetry: () => void;
}

/** Erro ao carregar: diz o que houve e oferece tentar de novo. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
    return (
        <div className="sg-state sg-state--error">
            <p className="sg-state__title">{message}</p>
            <div className="sg-state__action">
                <Button variant="secondary" onClick={onRetry}>
                    Tentar de novo
                </Button>
            </div>
        </div>
    );
}

export interface SpinnerProps {
    label?: string;
}

/** Carregando (anunciado para leitor de tela). */
export function Spinner({ label = "Carregando" }: SpinnerProps) {
    return (
        <div className="sg-spinner" role="status">
            <span className="sg-spinner__circle" aria-hidden="true" />
            <span>{label}…</span>
        </div>
    );
}
