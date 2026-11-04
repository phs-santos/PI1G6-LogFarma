import { useEffect, useState } from "react";

/** O valor só muda depois de `ms` sem alteração (evita uma busca por letra digitada). */
export function useDebounced<T>(value: T, ms = 250): T {
    const [current, setCurrent] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setCurrent(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return current;
}
