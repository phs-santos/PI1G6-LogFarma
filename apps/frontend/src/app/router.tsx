import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { Entrar } from "../pages/entrar/Entrar";
import { NovaSenha } from "../pages/entrar/NovaSenha";
import { RecuperarConta } from "../pages/entrar/RecuperarConta";
import { NaoEncontrada } from "../pages/comum/NaoEncontrada";
import { PedidosCompra } from "../pages/fornecedor/PedidosCompra";
import { Contas } from "../pages/gestor/Contas";
import { ManagerTabs } from "../pages/gestor/ManagerTabs";
import { Painel } from "../pages/gestor/Painel";
import { EntregaDetalhe } from "../pages/entregador/EntregaDetalhe";
import { EntregasEntregador } from "../pages/entregador/Entregas";
import { Compras } from "../pages/farmacia/Compras";
import { Entregas } from "../pages/farmacia/Entregas";
import { Estoque } from "../pages/farmacia/Estoque";
import { NovoMedicamento } from "../pages/farmacia/NovoMedicamento";
import { Pedidos } from "../pages/farmacia/Pedidos";
import { Transferencias } from "../pages/farmacia/Transferencias";
import { Avisos } from "../pages/paciente/Avisos";
import { ConfirmarPedido } from "../pages/paciente/ConfirmarPedido";
import { CriarConta } from "../pages/paciente/CriarConta";
import { Inicio } from "../pages/paciente/Inicio";
import { MeusDados } from "../pages/paciente/MeusDados";
import { MeusPedidos } from "../pages/paciente/MeusPedidos";
import { SeuPedido } from "../pages/paciente/SeuPedido";
import { OndeTem } from "../pages/paciente/OndeTem";
import { OutrasUnidades } from "../pages/paciente/OutrasUnidades";
import { Procurar } from "../pages/paciente/Procurar";
import { VouBuscar } from "../pages/paciente/VouBuscar";
import { CourierLayout } from "./layouts/CourierLayout";
import { DesktopLayout } from "./layouts/DesktopLayout";
import { PatientLayout } from "./layouts/PatientLayout";
import { RequireRole } from "./RequireRole";
import { SessionRoot } from "./session";

/** Todas as telas, com endereços em português. */
export const appRoutes: RouteObject[] = [
    {
        element: <SessionRoot />,
        children: [
            { path: "/entrar", element: <Entrar /> },
            { path: "/cadastro", element: <CriarConta /> },
            { path: "/recuperar-conta", element: <RecuperarConta /> },
            { path: "/nova-senha", element: <NovaSenha /> },
            {
                element: (
                    <RequireRole roles={["patient"]}>
                        <PatientLayout />
                    </RequireRole>
                ),
                children: [
                    { path: "/", element: <Inicio /> },
                    { path: "/buscar", element: <Procurar /> },
                    { path: "/remedio/:id", element: <OndeTem /> },
                    { path: "/remedio/:id/unidades", element: <OutrasUnidades /> },
                    { path: "/remedio/:id/buscar/:pharmacyId", element: <VouBuscar /> },
                    { path: "/pedido/novo", element: <ConfirmarPedido /> },
                    { path: "/pedidos", element: <MeusPedidos /> },
                    { path: "/pedidos/:id", element: <SeuPedido /> },
                    { path: "/avisos", element: <Avisos /> },
                    { path: "/meus-dados", element: <MeusDados /> },
                ],
            },
            {
                element: (
                    <RequireRole roles={["pharmacy_staff"]}>
                        <DesktopLayout />
                    </RequireRole>
                ),
                children: [
                    { path: "/farmacia", element: <Navigate to="/farmacia/pedidos" replace /> },
                    { path: "/farmacia/pedidos/:id?", element: <Pedidos /> },
                    { path: "/farmacia/transferencias", element: <Transferencias /> },
                    { path: "/farmacia/compras", element: <Compras /> },
                    { path: "/farmacia/estoque", element: <Estoque /> },
                    {
                        path: "/farmacia/estoque/novo-medicamento",
                        element: (
                            <NovoMedicamento
                                backTo="/farmacia/estoque"
                                backLabel="Voltar ao estoque"
                            />
                        ),
                    },
                    { path: "/farmacia/entregas", element: <Entregas /> },
                ],
            },
            {
                element: (
                    <RequireRole roles={["courier"]}>
                        <CourierLayout />
                    </RequireRole>
                ),
                children: [
                    { path: "/entregas", element: <EntregasEntregador /> },
                    { path: "/entregas/:id", element: <EntregaDetalhe /> },
                ],
            },
            {
                element: (
                    <RequireRole roles={["supplier_staff"]}>
                        <DesktopLayout />
                    </RequireRole>
                ),
                children: [{ path: "/fornecedor", element: <PedidosCompra /> }],
            },
            {
                element: (
                    <RequireRole roles={["manager"]}>
                        <DesktopLayout />
                    </RequireRole>
                ),
                children: [
                    { path: "/gestao", element: <Painel /> },
                    { path: "/gestao/contas", element: <Contas /> },
                    {
                        path: "/gestao/medicamentos/novo",
                        element: (
                            <NovoMedicamento
                                backTo="/gestao"
                                backLabel="Voltar ao painel"
                                tabs={<ManagerTabs />}
                            />
                        ),
                    },
                ],
            },
            { path: "*", element: <NaoEncontrada /> },
        ],
    },
];

export function createAppRouter() {
    return createBrowserRouter(appRoutes);
}
