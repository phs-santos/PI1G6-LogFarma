import type { PriorityCategory } from "../../api/types";

export const PRIORITY_TEXT: Record<PriorityCategory, string> = {
    chronic: "Doença crônica",
    oncology: "Câncer (tratamento oncológico)",
    rare_disease: "Doença rara",
};

export const CONSENT_TEXT =
    "Autorizo usar essa informação só para me dar prioridade na lista de espera.";
