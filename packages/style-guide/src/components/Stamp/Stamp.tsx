import type { ReactNode } from "react";

export type StampTone = "ok" | "danger" | "neutral";

export interface StampProps {
    tone: StampTone;
    children: ReactNode;
    className?: string;
}

/** Carimbo de situação curta ("Em falta", "Tem", "Entregue"). */
export function Stamp({ tone, children, className = "" }: StampProps) {
    return <span className={`sg-stamp sg-stamp--${tone} ${className}`.trim()}>{children}</span>;
}
