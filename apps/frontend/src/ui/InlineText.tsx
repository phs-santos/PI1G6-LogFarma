import { useState, type FormEvent } from "react";
import { Button, TextField } from "@fatec-pi/style-guide";

/** Pequeno formulário com um texto obrigatório (motivo, quantidade…). */
export function InlineText(props: {
    label: string;
    submit: string;
    required: string;
    pending: boolean;
    inputMode?: "numeric" | "text";
    initial?: string;
    onSubmit: (value: string) => void;
    onCancel: () => void;
}) {
    const [value, setValue] = useState(props.initial ?? "");
    const [error, setError] = useState("");
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!value.trim()) return setError(props.required);
        setError("");
        props.onSubmit(value.trim());
    };
    return (
        <form className="app-inline-form" onSubmit={submit} noValidate>
            <TextField
                label={props.label}
                inputMode={props.inputMode}
                value={value}
                error={error || undefined}
                onChange={(e) => setValue(e.target.value)}
            />
            <div className="app-actions">
                <Button type="submit" loading={props.pending}>
                    {props.submit}
                </Button>
                <Button variant="ghost" onClick={props.onCancel}>
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
