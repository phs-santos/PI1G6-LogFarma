import { Checkbox, TextField } from "@fatec-pi/style-guide";
import type { PrescriptionInput } from "../api/types";

export const EMPTY_PRESCRIPTION: PrescriptionInput = {
    issuedAt: "",
    prescriberName: "",
    prescriberCouncil: "CRM",
    prescriberNumber: "",
    prescriberState: "SP",
    continuousUse: false,
};

/** Mensagem do que falta; vazio quando dá para enviar. */
export function prescriptionProblem(rx: PrescriptionInput): string {
    if (!rx.issuedAt || !rx.prescriberName.trim() || !rx.prescriberNumber.trim()) {
        return "Preencha a data, o nome e o número de quem receitou.";
    }
    return "";
}

export function cleanPrescription(rx: PrescriptionInput): PrescriptionInput {
    return {
        ...rx,
        prescriberName: rx.prescriberName.trim(),
        prescriberCouncil: rx.prescriberCouncil.trim().toUpperCase(),
        prescriberNumber: rx.prescriberNumber.trim(),
        prescriberState: rx.prescriberState.trim().toUpperCase(),
    };
}

/** Os dados que estão no papel da receita. */
export function PrescriptionFields(props: {
    value: PrescriptionInput;
    onChange: (rx: PrescriptionInput) => void;
}) {
    const { value: rx, onChange } = props;
    return (
        <>
            <TextField
                label="Data da receita"
                type="date"
                value={rx.issuedAt}
                onChange={(e) => onChange({ ...rx, issuedAt: e.target.value })}
            />
            <TextField
                label="Nome de quem receitou"
                value={rx.prescriberName}
                onChange={(e) => onChange({ ...rx, prescriberName: e.target.value })}
            />
            <TextField
                label="Conselho"
                hint="Está no carimbo da receita: CRM, CRO…"
                value={rx.prescriberCouncil}
                onChange={(e) => onChange({ ...rx, prescriberCouncil: e.target.value })}
            />
            <TextField
                label="Número do conselho"
                inputMode="numeric"
                value={rx.prescriberNumber}
                onChange={(e) => onChange({ ...rx, prescriberNumber: e.target.value })}
            />
            <TextField
                label="Estado do conselho (UF)"
                maxLength={2}
                value={rx.prescriberState}
                onChange={(e) => onChange({ ...rx, prescriberState: e.target.value })}
            />
            <Checkbox
                label="É remédio de uso contínuo"
                checked={rx.continuousUse}
                onChange={(e) => onChange({ ...rx, continuousUse: e.target.checked })}
            />
        </>
    );
}
