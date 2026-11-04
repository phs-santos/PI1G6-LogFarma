import { useQuery } from "@tanstack/react-query";
import { getAvailability } from "../../api/medications";
import { listPharmacies } from "../../api/pharmacies";
import { qk } from "../../app/queryKeys";

/**
 * Cada consulta de disponibilidade fica registrada como busca (painel do gestor),
 * então esta tela não se atualiza sozinha: só quando a paciente abre de novo.
 */
export function useAvailability(medicationId: string) {
    return useQuery({
        queryKey: qk.availability(medicationId),
        queryFn: () => getAvailability(medicationId),
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function usePharmacies() {
    return useQuery({ queryKey: qk.pharmacies, queryFn: listPharmacies, staleTime: 60 * 60_000 });
}
