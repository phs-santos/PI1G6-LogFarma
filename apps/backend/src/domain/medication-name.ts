const FORM_LABEL: Record<string, string> = {
    tablet: "comprimido",
    capsule: "cápsula",
    oral_solution: "solução oral",
    oral_suspension: "suspensão oral",
    injectable: "injetável",
    cream: "creme",
    inhaler: "inalador",
    other: "",
};

/** "Losartana potássica 50 mg comprimido" */
export function medicationDisplayName(m: {
    activeIngredient: string;
    concentration: string;
    pharmaceuticalForm: string;
}): string {
    return [m.activeIngredient, m.concentration, FORM_LABEL[m.pharmaceuticalForm] ?? ""]
        .filter(Boolean)
        .join(" ");
}
