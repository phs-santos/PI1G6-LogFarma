import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/client";

/** Erro 4xx é resposta definitiva (dado errado, sem permissão): não adianta repetir. */
function shouldRetry(failureCount: number, error: unknown): boolean {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
    return failureCount < 1;
}

export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 10_000,
                refetchIntervalInBackground: false,
                retry: shouldRetry,
            },
            mutations: { retry: false },
        },
    });
}
