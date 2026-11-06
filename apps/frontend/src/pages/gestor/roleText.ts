import type { StaffRole } from "../../api/types";

export const ROLE_TEXT: Record<StaffRole, string> = {
    pharmacy_staff: "Profissional da farmácia",
    supplier_staff: "Atendente de fornecedor",
    courier: "Entregador",
    manager: "Gestor",
};
