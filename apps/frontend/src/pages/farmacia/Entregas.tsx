import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@fatec-pi/style-guide";
import { listPharmacyDeliveries } from "../../api/pharmacy";
import type { DeliveryView } from "../../api/types";
import { LIVE, qk } from "../../app/queryKeys";
import { Loaded } from "../../ui/Loaded";
import { PharmacyTabs } from "./PharmacyTabs";
import "./farmacia.css";
import { usePageTitle } from "../../app/usePageTitle";

function statusText(d: DeliveryView): string {
    switch (d.status) {
        case "scheduled":
            return d.courierId
                ? "Aceita pelo entregador, aguardando retirada"
                : "Aguardando um entregador";
        case "out_for_delivery":
            return "Saiu para entrega";
        case "delivered":
            return `Entregue a ${d.receivedBy ?? "quem recebeu"}`;
        case "failed":
            return `Não entregue: ${d.failureReason ?? "sem motivo"}`;
    }
}

/** RF08: entregas da unidade. */
export function Entregas() {
    usePageTitle("Entregas da unidade");
    const query = useQuery({
        queryKey: qk.pharmacy.deliveries,
        queryFn: listPharmacyDeliveries,
        refetchInterval: LIVE,
    });
    return (
        <>
            <PharmacyTabs />
            <h1>Entregas</h1>
            <Loaded query={query} what="as entregas">
                {(rows) => (
                    <DataTable
                        caption="Entregas da unidade"
                        rows={rows}
                        rowKey={(d) => d.id}
                        emptyText="Nenhuma entrega agendada."
                        columns={[
                            { key: "med", header: "Remédio", render: (d) => d.medication ?? "—" },
                            {
                                key: "to",
                                header: "Para",
                                render: (d) =>
                                    d.recipient ? `${d.recipient.name}, ${d.area}` : d.area,
                            },
                            { key: "window", header: "Quando", render: (d) => d.scheduledWindow },
                            {
                                key: "cold",
                                header: "Conservação",
                                render: (d) =>
                                    d.requiresRefrigeration ? "Refrigerado" : "Ambiente",
                            },
                            { key: "status", header: "Situação", render: statusText },
                        ]}
                    />
                )}
            </Loaded>
        </>
    );
}
