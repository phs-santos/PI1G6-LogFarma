import { NavLink } from "react-router";

/** Itens do menu da gestão da rede: cada área abre numa lista; criar e editar são diálogos. */
export function ManagerNav() {
    return (
        <>
            <NavLink to="/gestao" end>
                Painel
            </NavLink>
            <NavLink to="/gestao/usuarios">Usuários</NavLink>
            <NavLink to="/gestao/medicamentos">Medicamentos</NavLink>
            <NavLink to="/gestao/unidades">Unidades</NavLink>
        </>
    );
}
