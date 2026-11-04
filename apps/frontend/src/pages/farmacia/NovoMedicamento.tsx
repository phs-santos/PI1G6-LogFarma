import { useState } from "react";
import { Link } from "react-router";
import { Notice } from "@fatec-pi/style-guide";
import { createMedication } from "../../api/medications";
import { qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { MedicamentoForm } from "./MedicamentoForm";

/** Tela de cadastro de medicamento (farmácia: volta ao Estoque; gestor: ao painel). */
export function NovoMedicamento({
    backTo,
    backLabel,
    tabs,
}: {
    backTo: string;
    backLabel: string;
    tabs?: React.ReactNode;
}) {
    const [saved, setSaved] = useState("");
    const [formKey, setFormKey] = useState(0);
    const create = useActionMutation(createMedication, {
        invalidate: [["medications"], qk.pharmacy.stock],
        onSuccess: (m) => {
            setSaved(`${m.activeIngredient} ${m.concentration} cadastrado.`);
            setFormKey((k) => k + 1);
        },
    });
    return (
        <>
            {tabs}
            <p>
                <Link className="app-link" to={backTo}>
                    {backLabel}
                </Link>
            </p>
            <h1>Cadastrar medicamento</h1>
            <div aria-live="polite">{saved && <Notice tone="success" title={saved} />}</div>
            {create.isError && (
                <Notice tone="danger" title="Não foi possível salvar.">
                    <p>{create.error.message}</p>
                </Notice>
            )}
            <MedicamentoForm
                key={formKey}
                pending={create.isPending}
                onSubmit={(input) => create.run(input)}
            />
        </>
    );
}
