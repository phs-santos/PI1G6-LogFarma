import type { PriorityCategory } from "../../api/types";

export const PRIORITY_TEXT: Record<PriorityCategory, string> = {
    chronic: "Doença crônica",
    oncology: "Câncer (tratamento oncológico)",
    rare_disease: "Doença rara",
};

export const CONSENT_TEXT =
    "Autorizo usar essa informação só para me dar prioridade na lista de espera.";

/** Textos do cadastro e de Meus dados (iguais nas duas telas). */
export const MOBILITY_TEXT = "Tenho dificuldade para locomoção";
export const PRIORITY_QUESTION = "Possui alguma condição listada abaixo?";
export const NO_PRIORITY_TEXT = "Não tenho / prefiro não dizer";
