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

/** Dias de hoje até a data (negativo se já passou), contando dias de calendário locais. */
export function daysUntil(isoDay: string, now: Date = new Date()): number {
    const [y, m, d] = isoDay.split("-").map(Number);
    const target = new Date(y!, m! - 1, d!);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Hoje como "aaaa-mm-dd" no horário local. */
export function todayIso(now: Date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Dias desde a data/hora até hoje: 0 = hoje. */
export function daysSince(iso: string, now: Date = new Date()): number {
    return -daysUntil(todayIso(new Date(iso)), now);
}
