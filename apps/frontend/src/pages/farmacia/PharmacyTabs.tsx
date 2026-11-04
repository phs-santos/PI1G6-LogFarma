import { useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Tabs } from "@fatec-pi/style-guide";
import { listPharmacyRequests, listTransfers } from "../../api/pharmacy";
import { LIVE, qk } from "../../app/queryKeys";
import "./farmacia.css";

/** Abas da farmácia, com o número de pendências em Pedidos e Transferências. */
export function PharmacyTabs() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const requests = useQuery({
        queryKey: qk.pharmacy.requests(),
        queryFn: () => listPharmacyRequests(),
        refetchInterval: LIVE,
    });
    const incoming = useQuery({
        queryKey: qk.pharmacy.transfers("incoming"),
        queryFn: () => listTransfers("incoming"),
        refetchInterval: LIVE,
    });
    const active = pathname.split("/")[2] ?? "pedidos";
    return (
        <Tabs
            label="Áreas da farmácia"
            activeId={active}
            onSelect={(id) => navigate(`/farmacia/${id}`)}
            items={[
                {
                    id: "pedidos",
                    label: "Pedidos",
                    count: requests.data?.filter((i) => i.request.status === "requested").length,
                },
                {
                    id: "transferencias",
                    label: "Transferências",
                    count: incoming.data?.filter((t) => t.status === "requested").length,
                },
                { id: "compras", label: "Compras" },
                { id: "estoque", label: "Estoque" },
                { id: "entregas", label: "Entregas" },
            ]}
        />
    );
}
