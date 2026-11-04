import { useId } from "react";

export interface SegmentedOption<V extends string> {
    value: V;
    label: string;
    /** Explicação curta embaixo do rótulo. */
    hint?: string;
}

export interface SegmentedProps<V extends string> {
    /** Nome do grupo para o leitor de tela (não aparece na tela). */
    label: string;
    options: SegmentedOption<V>[];
    value: V;
    onChange: (value: V) => void;
    className?: string;
}

/**
 * Escolha entre poucas opções lado a lado (ex.: "Sou paciente" / "Sou da equipe").
 * Por baixo são rádios nativos: setas do teclado e leitor de tela funcionam sozinhos.
 */
export function Segmented<V extends string>({
    label,
    options,
    value,
    onChange,
    className = "",
}: SegmentedProps<V>) {
    const name = useId();
    return (
        <fieldset
            className={`sg-segmented ${className}`.trim()}
            role="radiogroup"
            aria-label={label}
        >
            {options.map((o) => (
                <label
                    key={o.value}
                    className={`sg-segmented__option${o.value === value ? " sg-segmented__option--on" : ""}`}
                >
                    <input
                        type="radio"
                        className="sg-visually-hidden"
                        name={name}
                        value={o.value}
                        checked={o.value === value}
                        onChange={() => onChange(o.value)}
                    />
                    <span className="sg-segmented__label">{o.label}</span>
                    {o.hint && <span className="sg-segmented__hint">{o.hint}</span>}
                </label>
            ))}
        </fieldset>
    );
}
