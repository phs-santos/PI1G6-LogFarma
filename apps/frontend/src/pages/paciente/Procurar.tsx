import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchField } from "@fatec-pi/style-guide";
import { searchMedications } from "../../api/medications";
import { qk } from "../../app/queryKeys";
import { useDebounced } from "../../lib/useDebounced";
import "./paciente.css";

/** RF01: procurar o remédio pelo nome, com sugestões enquanto digita. */
export function Procurar() {
    const navigate = useNavigate();
    const [text, setText] = useState("");
    const term = useDebounced(text.trim());
    const enabled = term.length >= 2;
    const results = useQuery({
        queryKey: qk.search(term),
        queryFn: () => searchMedications(term),
        enabled,
        staleTime: 60_000,
    });
    const items = enabled ? (results.data ?? []) : [];

    return (
        <>
            <h1>Procurar remédio</h1>
            <SearchField
                label="Qual remédio você precisa?"
                value={text}
                onChange={setText}
                placeholder="Ex.: losartana"
                suggestions={items.map((m) => ({
                    id: m.id,
                    label: m.displayName,
                    tarja: m.prescriptionType,
                }))}
                onSelect={(id) => navigate(`/remedio/${id}`)}
            />
            <p className="app-lead" aria-live="polite">
                {!enabled
                    ? "Digite pelo menos 2 letras do nome."
                    : results.isSuccess && items.length === 0
                      ? `Nenhum remédio encontrado com “${term}”. Confira o nome na receita.`
                      : results.isError
                        ? "Não foi possível buscar agora. Verifique a internet e tente de novo."
                        : ""}
            </p>
        </>
    );
}
