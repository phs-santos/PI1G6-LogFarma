import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button, ErrorState, Notice, Spinner } from "@fatec-pi/style-guide";
import { ApiError } from "../api/client";

function failureText(what: string, error: Error): string {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500)
        return error.message;
    return `Não foi possível carregar ${what}. Verifique a internet e toque em Tentar de novo.`;
}

interface Props<T> {
    query: UseQueryResult<T, Error>;
    /** Complemento de "Não foi possível carregar …" e "Carregando …". */
    what: string;
    children: (data: T) => ReactNode;
}

/**
 * Carregando, erro e dado, iguais em todas as telas. Se a atualização falha depois de
 * já ter dado na tela, o dado fica e aparece um aviso com "Tentar de novo".
 */
export function Loaded<T>({ query, what, children }: Props<T>) {
    if (query.data !== undefined) {
        return (
            <>
                {query.isError && (
                    <Notice tone="attention" title="Não foi possível atualizar agora.">
                        <p>Mostrando o que já tinha carregado.</p>
                        <Button variant="secondary" onClick={() => void query.refetch()}>
                            Tentar de novo
                        </Button>
                    </Notice>
                )}
                {children(query.data)}
            </>
        );
    }
    if (query.isError) {
        return (
            <ErrorState
                message={failureText(what, query.error)}
                onRetry={() => void query.refetch()}
            />
        );
    }
    return <Spinner label={`Carregando ${what}`} />;
}
