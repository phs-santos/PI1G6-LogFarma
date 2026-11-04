import { useId, useState, type KeyboardEvent } from "react";
import { Tarja, type TarjaType } from "../Tarja/Tarja";

export interface SearchSuggestion {
    id: string;
    label: string;
    description?: string;
    tarja?: TarjaType;
}

export interface SearchFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    suggestions: SearchSuggestion[];
    onSelect: (id: string) => void;
    placeholder?: string;
}

/** Busca grande com sugestões (padrão ARIA combobox: setas, Enter, Esc). */
export function SearchField({
    label,
    value,
    onChange,
    suggestions,
    onSelect,
    placeholder,
}: SearchFieldProps) {
    const id = useId();
    const listId = `${id}-list`;
    const [active, setActive] = useState(-1);
    const [closed, setClosed] = useState(false);
    const open = !closed && suggestions.length > 0;
    const optionId = (i: number) => `${id}-opt-${i}`;

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown" && suggestions.length > 0) {
            e.preventDefault();
            setClosed(false);
            setActive((i) => (i + 1) % suggestions.length);
        } else if (e.key === "ArrowUp" && suggestions.length > 0) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        } else if (e.key === "Enter" && open && active >= 0) {
            e.preventDefault();
            onSelect(suggestions[active]!.id);
        } else if (e.key === "Escape") {
            setClosed(true);
            setActive(-1);
        }
    };

    return (
        <div className="sg-search">
            <label className="sg-search__label" htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                className="sg-search__input"
                type="search"
                role="combobox"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={listId}
                aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    setClosed(false);
                    setActive(-1);
                    onChange(e.target.value);
                }}
                onKeyDown={onKeyDown}
            />
            {open && (
                <ul className="sg-search__list" id={listId} role="listbox" aria-label={label}>
                    {suggestions.map((s, i) => (
                        <li
                            key={s.id}
                            id={optionId(i)}
                            role="option"
                            aria-selected={i === active}
                            className={`sg-search__option${i === active ? " sg-search__option--active" : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onSelect(s.id)}
                        >
                            <span className="sg-search__option-label">{s.label}</span>
                            {s.description && (
                                <span className="sg-search__option-desc">{s.description}</span>
                            )}
                            {s.tarja && <Tarja type={s.tarja} />}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
