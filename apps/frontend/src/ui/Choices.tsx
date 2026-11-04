import { useId, type ReactNode } from "react";

/** Grupo de opções grandes (uma escolha só), com a pergunta como nome do grupo. */
export function Choices({ legend, children }: { legend: string; children: ReactNode }) {
    const id = useId();
    return (
        <fieldset className="app-choices" role="radiogroup" aria-labelledby={id}>
            <legend id={id}>{legend}</legend>
            {children}
        </fieldset>
    );
}

export function Choice(props: {
    name: string;
    label: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label className="app-choice">
            <input
                type="radio"
                name={props.name}
                checked={props.checked}
                onChange={props.onChange}
            />
            <span>{props.label}</span>
        </label>
    );
}
