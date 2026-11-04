/** "1,1 km" */
export function formatKm(km: number): string {
    return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

/** "há 2 h", "há 5 min", "agora mesmo", "há 3 dias". */
export function formatAgo(iso: string, now: number = Date.now()): string {
    const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
    if (minutes < 1) return "agora mesmo";
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

/** Link de telefone só com os números: "tel:1632522000". */
export function telHref(phone: string): string {
    return `tel:${phone.replace(/\D/g, "")}`;
}

/** "(16) 3252-1002" a partir de "1632521002"; outro formato volta como veio. */
export function formatPhone(phone: string): string {
    const d = phone.replace(/\D/g, "");
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return phone;
}
