/** Minúsculo e sem acento, para a busca achar "joao" em "João". */
export function normalizeText(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
