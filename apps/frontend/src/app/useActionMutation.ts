import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

export interface ActionOptions<TVars, TData> {
    /** Chaves que a ação deixa desatualizadas (recarregam depois do sucesso). */
    invalidate: QueryKey[];
    onSuccess?: (data: TData, vars: TVars) => void;
}

/**
 * Ação de um botão (Separar, Enviar, Confirmar pedido…). `isPending` vai para o
 * `Button loading`, que fica desabilitado: toque duplo não manda a ação duas vezes.
 */
export function useActionMutation<TVars, TData>(
    fn: (vars: TVars) => Promise<TData>,
    { invalidate, onSuccess }: ActionOptions<TVars, TData>,
) {
    const client = useQueryClient();
    return useMutation<TData, Error, TVars>({
        mutationFn: fn,
        onSuccess: async (data, vars) => {
            await Promise.all(invalidate.map((queryKey) => client.invalidateQueries({ queryKey })));
            onSuccess?.(data, vars);
        },
    });
}
