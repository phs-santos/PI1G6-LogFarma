import type {
    AdministrationRoute,
    MedicationComponent,
    PharmaceuticalForm,
    PrescriptionType,
    StorageCondition,
} from "../../api/types";

export const FORM_TEXT: Record<PharmaceuticalForm, string> = {
    tablet: "Comprimido",
    capsule: "Cápsula",
    oral_solution: "Solução oral",
    oral_suspension: "Suspensão oral",
    injectable: "Injetável",
    cream: "Creme ou pomada",
    inhaler: "Inalador (bombinha)",
    other: "Outra",
};

export const ROUTE_TEXT: Record<AdministrationRoute, string> = {
    oral: "Oral",
    subcutaneous: "Subcutânea",
    intramuscular: "Intramuscular",
    intravenous: "Intravenosa",
    topical: "Na pele (tópica)",
    inhalation: "Inalatória",
    other: "Outra",
};

export const COMPONENT_TEXT: Record<MedicationComponent, string> = {
    basic: "Básico",
    strategic: "Estratégico",
    specialized: "Especializado",
};

export const PRESCRIPTION_TEXT: Record<PrescriptionType, string> = {
    none: "Não precisa de receita",
    simple: "Receita simples",
    antimicrobial: "Antimicrobiano (receita retida)",
    special_control: "Controle especial (receita retida)",
};

export const STORAGE_TEXT: Record<StorageCondition, string> = {
    room_temperature: "Temperatura ambiente",
    refrigerated: "Geladeira (2 °C a 8 °C)",
};

export function optionsOf<K extends string>(map: Record<K, string>): { value: K; label: string }[] {
    return (Object.keys(map) as K[]).map((value) => ({ value, label: map[value] }));
}
