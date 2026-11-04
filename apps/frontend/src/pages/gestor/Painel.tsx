import { useQuery } from "@tanstack/react-query";
import { BarList, DataTable, StatTile } from "@fatec-pi/style-guide";
import { getExpiringStock, getSummary, getUnmetDemand } from "../../api/manager";
import type { UnmetDemandItem } from "../../api/types";
import { qk, REGULAR } from "../../app/queryKeys";
import { daysUntil, formatDate } from "../../lib/dates";
import { Loaded } from "../../ui/Loaded";
import { ManagerTabs } from "./ManagerTabs";
import "./gestor.css";
import { usePageTitle } from "../../app/usePageTitle";

/** Soma as buscas sem estoque de cada remédio em todas as unidades, maior primeiro. */
export function totalsByMedication(items: UnmetDemandItem[]): { label: string; value: number }[] {
    const totals = new Map<string, number>();
    for (const i of items) totals.set(i.displayName, (totals.get(i.displayName) ?? 0) + i.searches);
    return [...totals]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
}

/** Painel da rede: onde falta remédio, o que vai vencer e quem espera. */
export function Painel() {
    usePageTitle("Painel da rede");
    const summary = useQuery({
        queryKey: qk.manager.summary,
        queryFn: getSummary,
        refetchInterval: REGULAR,
    });
    const unmet = useQuery({
        queryKey: qk.manager.unmetDemand,
        queryFn: () => getUnmetDemand(),
        refetchInterval: REGULAR,
    });
    const expiring = useQuery({
        queryKey: qk.manager.expiring,
        queryFn: () => getExpiringStock(60),
        refetchInterval: REGULAR,
    });

    return (
        <>
            <ManagerTabs />
            <h1>Painel da rede</h1>
            <Loaded query={summary} what="os números da rede">
                {(s) => (
                    <div className="app-stats">
                        <StatTile value={s.unmetSearches7d} label="Buscas sem estoque (7 dias)" />
                        <StatTile value={s.expiringBatches60d} label="Lotes vencendo (60 dias)" />
                        <StatTile value={s.waitingPatients} label="Pacientes na fila de espera" />
                    </div>
                )}
            </Loaded>
            <div className="app-panels">
                <section aria-labelledby="mais-procurados">
                    <h2 id="mais-procurados" className="sg-visually-hidden">
                        Remédios mais procurados sem estoque
                    </h2>
                    <Loaded query={unmet} what="as buscas sem estoque">
                        {(items) =>
                            items.length === 0 ? (
                                <p>Nenhuma busca sem estoque nos últimos 7 dias.</p>
                            ) : (
                                <BarList
                                    label="Remédios mais procurados sem estoque (7 dias)"
                                    items={totalsByMedication(items)}
                                />
                            )
                        }
                    </Loaded>
                </section>
                <Loaded query={expiring} what="os lotes perto de vencer">
                    {(rows) => (
                        <DataTable
                            caption="Lotes perto de vencer"
                            rows={rows}
                            rowKey={(b) => `${b.pharmacyName}-${b.batchNumber}`}
                            emptyText="Nenhum lote vence nos próximos 60 dias."
                            columns={[
                                { key: "med", header: "Remédio", render: (b) => b.displayName },
                                { key: "unit", header: "Unidade", render: (b) => b.pharmacyName },
                                { key: "batch", header: "Lote", render: (b) => b.batchNumber },
                                {
                                    key: "exp",
                                    header: "Vence",
                                    render: (b) =>
                                        `${formatDate(b.expiryDate)} (em ${daysUntil(b.expiryDate)} dias)`,
                                },
                                {
                                    key: "qty",
                                    header: "Quantidade",
                                    render: (b) => `${b.quantity} un.`,
                                },
                            ]}
                        />
                    )}
                </Loaded>
            </div>
        </>
    );
}
