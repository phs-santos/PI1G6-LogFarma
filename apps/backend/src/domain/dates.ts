// Datas de negócio (validade, idade, "hoje") são dias do calendário de São Paulo, em ISO (YYYY-MM-DD).
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

export function isoDay(at: Date = new Date()): string {
    return dayFormatter.format(at);
}

export function addDays(isoDate: string, amount: number): string {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + amount);
    return d.toISOString().slice(0, 10);
}

/** Idade completa em anos na data `onDay` (ISO). */
export function ageOn(birthDate: string, onDay: string): number {
    const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
    const [ty, tm, td] = onDay.split("-").map(Number) as [number, number, number];
    let age = ty - by;
    if (tm < bm || (tm === bm && td < bd)) age -= 1;
    return age;
}
