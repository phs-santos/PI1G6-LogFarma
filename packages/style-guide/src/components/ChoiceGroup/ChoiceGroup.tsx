import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface ChoiceGroupProps {
    /** A pergunta; vira o nome do grupo para o leitor de tela. */
    legend: string;
    children: ReactNode;
    className?: string;
}

/** Opções grandes de escolha única (rádios em cartões), com a pergunta como nome. */
export function ChoiceGroup({ legend, children, className = "" }: ChoiceGroupProps) {
    const id = useId();
    return (
        <fieldset
            className={`sg-choice-group ${className}`.trim()}
            role="radiogroup"
            aria-labelledby={id}
        >
            <legend id={id} className="sg-choice-group__legend">
                {legend}
            </legend>
            {children}
        </fieldset>
    );
}

export interface ChoiceOptionProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label: string;
}

/** Uma opção: o cartão inteiro é clicável e fica marcado com borda e fundo. */
export function ChoiceOption({ label, className = "", ...props }: ChoiceOptionProps) {
    return (
        <label className={`sg-choice ${className}`.trim()}>
            <input type="radio" {...props} />
            <span>{label}</span>
        </label>
    );
}
