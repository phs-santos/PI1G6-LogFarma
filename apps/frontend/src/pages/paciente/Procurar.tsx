import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button, PageHeader, SearchField } from "@fatec-pi/style-guide";
import { searchMedications } from "../../api/medications";
import { qk } from "../../app/queryKeys";
import { RecentMedications } from "./RecentMedications";
import { useDebounced } from "../../lib/useDebounced";
import "./paciente.css";
import { usePageTitle } from "../../app/usePageTitle";

/** Atalhos para os remédios de uso contínuo mais pedidos na rede. */
const QUICK = ["Losartana", "Metformina", "Insulina", "Dipirona", "Sinvastatina", "Omeprazol"];

/** RF01: procurar o remédio pelo nome, com sugestões enquanto digita. */
export function Procurar() {
    usePageTitle("Procurar remédio");
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [text, setText] = useState(params.get("q") ?? "");
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
            <PageHeader
                title="Procurar remédio"
                description="Digite o nome que está na receita ou na caixa do remédio."
            />
            <div className="app-search">
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
                <p className="app-search__status" role="status">
                    {!enabled
                        ? "Digite pelo menos 2 letras do nome."
                        : results.isSuccess && items.length === 0
                          ? `Nenhum remédio encontrado com “${term}”. Confira o nome na receita.`
                          : results.isError
                            ? "Não foi possível buscar agora. Verifique a internet e tente de novo."
                            : ""}
                </p>
            </div>
            <RecentMedications allowClear />
            <section className="app-quick" role="group" aria-labelledby="mais-procurados">
                <h2 id="mais-procurados" className="app-quick__title">
                    Mais procurados
                </h2>
                <div className="app-quick__list">
                    {QUICK.map((name) => (
                        <Button
                            key={name}
                            variant="secondary"
                            onClick={() => setText(name.toLowerCase())}
                        >
                            {name}
                        </Button>
                    ))}
                </div>
            </section>
        </>
    );
}
