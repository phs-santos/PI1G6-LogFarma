import type { ReactNode } from "react";

export type NoticeTone = "success" | "attention" | "danger" | "info";

export interface NoticeProps {
    tone: NoticeTone;
    title: string;
    children?: ReactNode;
    /** Anuncia mudanças para leitor de tela (aviso que chega sozinho). */
    live?: boolean;
    className?: string;
}

const ICON: Record<NoticeTone, string> = { success: "✓", attention: "!", danger: "✕", info: "i" };

/** Aviso em destaque com ícone e texto (nunca só cor). */
export function Notice({ tone, title, children, live = false, className = "" }: NoticeProps) {
    return (
        <div
            className={`sg-notice sg-notice--${tone} ${className}`.trim()}
            role={live ? "status" : undefined}
        >
            <span className="sg-notice__icon" aria-hidden="true">
                {ICON[tone]}
            </span>
            <div>
                <p className="sg-notice__title">{title}</p>
                {children && <div className="sg-notice__body">{children}</div>}
            </div>
        </div>
    );
}
