import { useRef } from "react";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

export interface ActionOptions<TVars, TData> {
    /** Chaves que a ação deixa desatualizadas (recarregam depois do sucesso). */
    invalidate: QueryKey[];
    onSuccess?: (data: TData, vars: TVars) => void;
}

/**
 * Ação de um botão (Separar, Enviar, Confirmar pedido…). `isPending` vai para o
 * `Button loading`, e `run` ignora um segundo toque enquanto a primeira chamada não volta:
 * toque duplo não manda a ação duas vezes.
 */
export function useActionMutation<TVars, TData>(
    fn: (vars: TVars) => Promise<TData>,
    { invalidate, onSuccess }: ActionOptions<TVars, TData>,
) {
    const client = useQueryClient();
    const inFlight = useRef(false);
    const mutation = useMutation<TData, Error, TVars>({
        mutationFn: async (vars) => {
            try {
                return await fn(vars);
            } finally {
                inFlight.current = false;
            }
        },
        onSuccess: async (data, vars) => {
            await Promise.all(invalidate.map((queryKey) => client.invalidateQueries({ queryKey })));
            onSuccess?.(data, vars);
        },
    });
    const run = (vars: TVars) => {
        if (inFlight.current) return;
        inFlight.current = true;
        mutation.mutate(vars);
    };
    return { ...mutation, run };
}
