import type { ReactNode } from "react";
import { Button } from "../Button/Button";

export interface FilterBarProps {
    /** Nome da busca para leitor de tela (ex.: "Filtrar usuários"). */
    label: string;
    /** Campos de filtro (TextField type="search", SelectField…), lado a lado no computador. */
    children: ReactNode;
    /** Resumo do resultado (ex.: "7 medicamentos"). */
    summary?: ReactNode;
    /** Algum filtro diferente do padrão: mostra "Limpar filtros". */
    active?: boolean;
    onClear?: () => void;
}

/**
 * Barra de filtros padrão das listas: campos numa linha (filtram enquanto a pessoa digita ou
 * escolhe, sem botão "Buscar"), o resumo do resultado e "Limpar filtros" quando há filtro.
 */
export function FilterBar({ label, children, summary, active = false, onClear }: FilterBarProps) {
    return (
        <form
            className="sg-filter-bar"
            role="search"
            aria-label={label}
            onSubmit={(e) => e.preventDefault()}
        >
            <div className="sg-filter-bar__fields">{children}</div>
            {(summary || (active && onClear)) && (
                <div className="sg-filter-bar__foot">
                    {summary && (
                        <p className="sg-filter-bar__summary" aria-live="polite">
                            {summary}
                        </p>
                    )}
                    {active && onClear && (
                        <Button variant="ghost" size="sm" onClick={onClear}>
                            Limpar filtros
                        </Button>
                    )}
                </div>
            )}
        </form>
    );
}
