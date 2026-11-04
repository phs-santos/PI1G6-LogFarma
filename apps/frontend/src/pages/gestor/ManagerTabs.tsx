import { useLocation, useNavigate } from "react-router";
import { Tabs } from "@fatec-pi/style-guide";
import "../farmacia/farmacia.css";

const ROUTES: Record<string, string> = {
    painel: "/gestao",
    contas: "/gestao/contas",
    medicamentos: "/gestao/medicamentos/novo",
};

export function ManagerTabs() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const active = pathname.startsWith("/gestao/contas")
        ? "contas"
        : pathname.startsWith("/gestao/medicamentos")
          ? "medicamentos"
          : "painel";
    return (
        <Tabs
            label="Áreas da gestão"
            activeId={active}
            onSelect={(id) => navigate(ROUTES[id] ?? "/gestao")}
            items={[
                { id: "painel", label: "Painel" },
                { id: "contas", label: "Contas" },
                { id: "medicamentos", label: "Cadastrar medicamento" },
            ]}
        />
    );
}
