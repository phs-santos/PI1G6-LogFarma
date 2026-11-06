import { useState, type FormEvent } from "react";
import { Button, Checkbox, SelectField, TextField } from "@fatec-pi/style-guide";
import type { MedicationInput } from "../../api/types";
import {
    COMPONENT_TEXT,
    FORM_TEXT,
    optionsOf,
    PRESCRIPTION_TEXT,
    ROUTE_TEXT,
    STORAGE_TEXT,
} from "./medicationText";

const EMPTY: MedicationInput = {
    activeIngredient: "",
    concentration: "",
    pharmaceuticalForm: "tablet",
    route: "oral",
    dispensingUnit: "",
    component: "basic",
    therapeuticClass: "",
    prescriptionType: "none",
    storage: "room_temperature",
    inRename: true,
    inFarmaciaPopular: false,
};

type TextKey = "activeIngredient" | "concentration" | "dispensingUnit" | "therapeuticClass";
const REQUIRED: TextKey[] = [
    "activeIngredient",
    "concentration",
    "dispensingUnit",
    "therapeuticClass",
];

export interface MedicamentoFormProps {
    initial?: MedicationInput;
    pending: boolean;
    onSubmit: (input: MedicationInput) => void;
}

/** Cadastro de medicamento com todas as características (farmácia e gestor). */
export function MedicamentoForm({ initial, pending, onSubmit }: MedicamentoFormProps) {
    const [m, setM] = useState<MedicationInput>(initial ?? EMPTY);
    const [catmat, setCatmat] = useState(initial?.catmatCode ?? "");
    const [errors, setErrors] = useState<Partial<Record<TextKey, string>>>({});
    const set = <K extends keyof MedicationInput>(key: K, value: MedicationInput[K]) =>
        setM((old) => ({ ...old, [key]: value }));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const found: Partial<Record<TextKey, string>> = {};
        for (const key of REQUIRED) if (!m[key].trim()) found[key] = "Obrigatório.";
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        const input: MedicationInput = {
            ...m,
            activeIngredient: m.activeIngredient.trim(),
            concentration: m.concentration.trim(),
            dispensingUnit: m.dispensingUnit.trim(),
            therapeuticClass: m.therapeuticClass.trim(),
        };
        delete input.catmatCode;
        if (catmat.trim()) input.catmatCode = catmat.trim();
        onSubmit(input);
    };
    const text = (key: TextKey, label: string, hint?: string) => (
        <TextField
            label={label}
            hint={hint}
            value={m[key]}
            error={errors[key]}
            onChange={(e) => set(key, e.target.value)}
        />
    );

    return (
        <form className="app-med-form" onSubmit={submit} noValidate>
            <fieldset className="app-med-form__group">
                <legend>Identificação</legend>
                <div className="app-med-form__wide">
                    {text(
                        "activeIngredient",
                        "Princípio ativo",
                        "Por exemplo: Losartana potássica",
                    )}
                </div>
                {text("concentration", "Concentração", "Por exemplo: 50 mg")}
                <SelectField
                    label="Forma"
                    value={m.pharmaceuticalForm}
                    onChange={(e) =>
                        set(
                            "pharmaceuticalForm",
                            e.target.value as MedicationInput["pharmaceuticalForm"],
                        )
                    }
                    options={optionsOf(FORM_TEXT)}
                />
                <SelectField
                    label="Via"
                    value={m.route}
                    onChange={(e) => set("route", e.target.value as MedicationInput["route"])}
                    options={optionsOf(ROUTE_TEXT)}
                />
                {text(
                    "dispensingUnit",
                    "Unidade de entrega",
                    "Como é contado na entrega: comprimido, frasco…",
                )}
            </fieldset>
            <fieldset className="app-med-form__group">
                <legend>Classificação no SUS</legend>
                <SelectField
                    label="Componente do SUS"
                    value={m.component}
                    onChange={(e) =>
                        set("component", e.target.value as MedicationInput["component"])
                    }
                    options={optionsOf(COMPONENT_TEXT)}
                />
                {text("therapeuticClass", "Classe terapêutica", "Por exemplo: Anti-hipertensivo")}
                <SelectField
                    label="Tipo de receita"
                    value={m.prescriptionType}
                    onChange={(e) =>
                        set(
                            "prescriptionType",
                            e.target.value as MedicationInput["prescriptionType"],
                        )
                    }
                    options={optionsOf(PRESCRIPTION_TEXT)}
                />
                <TextField
                    label="Código CATMAT (opcional)"
                    value={catmat}
                    onChange={(e) => setCatmat(e.target.value)}
                />
            </fieldset>
            <fieldset className="app-med-form__group">
                <legend>Conservação e programas</legend>
                <SelectField
                    label="Conservação"
                    value={m.storage}
                    onChange={(e) => set("storage", e.target.value as MedicationInput["storage"])}
                    options={optionsOf(STORAGE_TEXT)}
                />
                <div className="app-med-form__checks">
                    <Checkbox
                        label="Está na RENAME"
                        checked={m.inRename}
                        onChange={(e) => set("inRename", e.target.checked)}
                    />
                    <Checkbox
                        label="Está no Farmácia Popular"
                        checked={m.inFarmaciaPopular}
                        onChange={(e) => set("inFarmaciaPopular", e.target.checked)}
                    />
                </div>
            </fieldset>
            <div className="app-med-form__actions">
                <Button type="submit" size="lg" loading={pending}>
                    Salvar medicamento
                </Button>
            </div>
        </form>
    );
}
