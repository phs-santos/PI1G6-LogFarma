/** Texto para busca: minúsculo, sem acento, espaços colapsados. */
export function normalizeSearch(text: string): string {
    return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}
