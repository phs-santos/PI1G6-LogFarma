// Máscaras de digitação: mostram o número do jeito que a pessoa conhece. A API recebe só os
// dígitos (use onlyDigits ao enviar).

const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

/** "(16) 99123-4567" (celular) ou "(16) 3252-1002" (fixo), enquanto digita. */
export function maskPhone(value: string): string {
    const d = digits(value, 11);
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    const ddd = d.slice(0, 2);
    const rest = d.slice(2);
    // Com 11 dígitos é celular (5 + 4); até 10, fixo (4 + 4).
    const split = d.length === 11 ? 5 : 4;
    if (rest.length <= split) return `(${ddd}) ${rest}`;
    return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** Cartão SUS: "898 0012 3456 7890". */
export function maskCns(value: string): string {
    const d = digits(value, 15);
    return [d.slice(0, 3), d.slice(3, 7), d.slice(7, 11), d.slice(11, 15)]
        .filter(Boolean)
        .join(" ");
}

/** CEP: "15990-020". */
export function maskCep(value: string): string {
    const d = digits(value, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
