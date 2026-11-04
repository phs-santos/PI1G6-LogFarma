import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

interface FieldExtras {
    label: string;
    hint?: string;
    error?: string;
}

function describedBy(ids: (string | false | undefined)[]): string | undefined {
    const list = ids.filter(Boolean).join(" ");
    return list || undefined;
}

function FieldShell({
    id,
    label,
    hint,
    error,
    hintId,
    errorId,
    children,
}: FieldExtras & { id: string; hintId: string; errorId: string; children: ReactNode }) {
    return (
        <div className={`sg-field${error ? " sg-field--error" : ""}`}>
            <label className="sg-field__label" htmlFor={id}>
                {label}
            </label>
            {hint && (
                <p className="sg-field__hint" id={hintId}>
                    {hint}
                </p>
            )}
            {children}
            {error && (
                <p className="sg-field__error" id={errorId}>
                    {error}
                </p>
            )}
        </div>
    );
}

export type TextFieldProps = FieldExtras & InputHTMLAttributes<HTMLInputElement>;

/** Campo de texto com rótulo visível, ajuda e erro ligados por aria-describedby. Datas: type="date". */
export function TextField({ label, hint, error, id, className = "", ...props }: TextFieldProps) {
    const auto = useId();
    const fieldId = id ?? auto;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;
    return (
        <FieldShell
            id={fieldId}
            label={label}
            hint={hint}
            error={error}
            hintId={hintId}
            errorId={errorId}
        >
            <input
                id={fieldId}
                className={`sg-field__control ${className}`.trim()}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy([hint && hintId, error && errorId])}
                {...props}
            />
        </FieldShell>
    );
}

export type SelectFieldProps = FieldExtras &
    SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] };

export function SelectField({
    label,
    hint,
    error,
    id,
    options,
    className = "",
    ...props
}: SelectFieldProps) {
    const auto = useId();
    const fieldId = id ?? auto;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;
    return (
        <FieldShell
            id={fieldId}
            label={label}
            hint={hint}
            error={error}
            hintId={hintId}
            errorId={errorId}
        >
            <select
                id={fieldId}
                className={`sg-field__control ${className}`.trim()}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy([hint && hintId, error && errorId])}
                {...props}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </FieldShell>
    );
}

export type CheckboxProps = Omit<FieldExtras, "error"> &
    Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Caixa de marcar com a linha inteira clicável. */
export function Checkbox({ label, hint, id, className = "", ...props }: CheckboxProps) {
    const auto = useId();
    const fieldId = id ?? auto;
    const hintId = `${fieldId}-hint`;
    return (
        <div className={`sg-checkbox ${className}`.trim()}>
            <input
                id={fieldId}
                type="checkbox"
                aria-describedby={hint ? hintId : undefined}
                {...props}
            />
            <label htmlFor={fieldId}>
                {label}
                {hint && (
                    <span className="sg-field__hint" id={hintId}>
                        {hint}
                    </span>
                )}
            </label>
        </div>
    );
}
