// Espelho de teste do normalizeSearch (Task 4) para montar fixtures antes dele existir.
export function normalizeSearchName(activeIngredient: string, concentration: string): string {
    return `${activeIngredient} ${concentration}`
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}
