/** "2026-11-12" → "12/11" (data sem hora: lida como dia local, sem fuso). */
export function formatDayMonth(isoDay: string): string {
    const [, m, d] = isoDay.split("-");
    return `${d}/${m}`;
}

/** "2026-11-12" → "12/11/2026" */
export function formatDate(isoDay: string): string {
    const [y, m, d] = isoDay.split("-");
    return `${d}/${m}/${y}`;
}

/** Hora local "10:32". */
export function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Data e hora locais curtas "04/11, 10:32". */
export function formatDayTime(iso: string): string {
    const d = new Date(iso);
    const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `${day}, ${formatTime(iso)}`;
}
