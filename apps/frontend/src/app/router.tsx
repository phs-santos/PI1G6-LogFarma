import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { Entrar } from "../pages/entrar/Entrar";
import { NaoEncontrada } from "../pages/comum/NaoEncontrada";
import { Placeholder } from "../pages/comum/Placeholder";
import { Pedidos } from "../pages/farmacia/Pedidos";
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

const page = (path: string, title: string): RouteObject => ({
    path,
    element: <Placeholder title={title} />,
});

/** Todas as telas, com endereços em português. */
export const appRoutes: RouteObject[] = [
    {
        element: <SessionRoot />,
        children: [
            { path: "/entrar", element: <Entrar /> },
            { path: "/cadastro", element: <CriarConta /> },
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
                    page("/farmacia/transferencias", "Transferências"),
                    page("/farmacia/compras", "Compras"),
                    page("/farmacia/estoque", "Estoque"),
                    page("/farmacia/estoque/novo-medicamento", "Cadastrar medicamento"),
                    page("/farmacia/entregas", "Entregas"),
                ],
            },
            {
                element: (
                    <RequireRole roles={["courier"]}>
                        <CourierLayout />
                    </RequireRole>
                ),
                children: [page("/entregas", "Entregas"), page("/entregas/:id", "Entrega")],
            },
            {
                element: (
                    <RequireRole roles={["supplier_staff"]}>
                        <DesktopLayout />
                    </RequireRole>
                ),
                children: [page("/fornecedor", "Pedidos de compra")],
            },
            {
                element: (
                    <RequireRole roles={["manager"]}>
                        <DesktopLayout />
                    </RequireRole>
                ),
                children: [
                    page("/gestao", "Painel da rede"),
                    page("/gestao/contas", "Contas"),
                    page("/gestao/medicamentos/novo", "Cadastrar medicamento"),
                ],
            },
            { path: "*", element: <NaoEncontrada /> },
        ],
    },
];

export function createAppRouter() {
    return createBrowserRouter(appRoutes);
}
