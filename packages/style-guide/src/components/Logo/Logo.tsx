/** Contornos do símbolo (alfinete + taça de Hígia com a serpente), em 64 x 64. */
export const LOGO_PATHS = {
    pin: "M32 2.5C18.7 2.5 8.5 12.6 8.5 25.6c0 16.1 20.4 34.6 22.3 36.3a1.8 1.8 0 0 0 2.4 0C35.1 60.2 55.5 41.7 55.5 25.6 55.5 12.6 45.3 2.5 32 2.5Z",
    bowl: "M20.5 20.5h21.4c0 7.2-4.8 11.9-10.7 11.9s-10.7-4.7-10.7-11.9Z",
    stem: "M30.1 32h2.2v11.6h-2.2Z",
    base: "M24.6 43.2h13.2a1.5 1.5 0 0 1 0 3H24.6a1.5 1.5 0 0 1 0-3Z",
    snake: "M26.4 41.6c3.4 1.3 9.4-.4 9.1-2.3-.3-1.8-8.1-1.2-8.2-3.3-.1-1.8 6.6-2.1 10.6-4.6 4.6-2.9 7.1-8.4 5.9-13-1.1-4.2-5.6-6.2-9.6-4.6",
    head: "M33.8 11.1c1.9-.7 4.1.1 4.6 1.8.4 1.4-.6 2.6-2.2 2.9-1.9.4-3.6-.4-4-1.8-.3-1.1.4-2.4 1.6-2.9Z",
} as const;

export interface LogoSymbolProps {
    /** true quando o nome "LogFarma" já está escrito ao lado (o leitor de tela não repete). */
    decorative?: boolean;
    className?: string;
}

/** Só o símbolo: ícone do app, favicon, avatar. */
export function LogoSymbol({ decorative = false, className = "" }: LogoSymbolProps) {
    const a11y = decorative
        ? { "aria-hidden": true as const }
        : { role: "img" as const, "aria-label": "LogFarma" };
    return (
        <svg
            className={`sg-logo__symbol ${className}`.trim()}
            viewBox="0 0 64 64"
            focusable="false"
            {...a11y}
        >
            <path className="sg-logo__pin" d={LOGO_PATHS.pin} />
            <g className="sg-logo__mark">
                <path d={LOGO_PATHS.bowl} />
                <path d={LOGO_PATHS.stem} />
                <path d={LOGO_PATHS.base} />
                <path
                    d={LOGO_PATHS.snake}
                    fill="none"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="sg-logo__snake"
                />
                <path d={LOGO_PATHS.head} />
            </g>
        </svg>
    );
}

export interface LogoProps {
    /** "ink": sobre fundo claro. "white": sobre a faixa azul. */
    tone?: "ink" | "white";
    className?: string;
}

/**
 * Logo completo: alfinete de mapa ("onde tem") com a taça de Hígia (farmácia) e o nome
 * com a tarja vermelha da caixa do remédio. O tamanho segue a letra de quem o contém.
 */
export function Logo({ tone = "ink", className = "" }: LogoProps) {
    return (
        <span
            className={`sg-logo sg-logo--${tone} ${className}`.trim()}
            role="img"
            aria-label="LogFarma"
        >
            <LogoSymbol decorative />
            <span className="sg-logo__word">LogFarma</span>
        </span>
    );
}
