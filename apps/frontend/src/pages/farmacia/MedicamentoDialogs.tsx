import { useQuery } from "@tanstack/react-query";
import { Notice } from "@fatec-pi/style-guide";
import { createMedication, getMedication, updateMedication } from "../../api/medications";
import { qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { Loaded } from "../../ui/Loaded";
import { MedicamentoForm } from "./MedicamentoForm";

// Conteúdo dos diálogos "Cadastrar medicamento" e "Editar" (gestão e estoque da farmácia).
// Avisam com o nome ("Losartana potássica 50 mg") quando salvam.

export function CreateMedication({ onDone }: { onDone: (name: string) => void }) {
    const create = useActionMutation(createMedication, {
        invalidate: [["medications"], ["manager", "medications"], qk.pharmacy.stock],
        onSuccess: (m) => onDone(`${m.activeIngredient} ${m.concentration}`),
    });
    return (
        <>
            {create.isError && (
                <Notice tone="danger" title="Não foi possível salvar.">
                    <p>{create.error.message}</p>
                </Notice>
            )}
            <MedicamentoForm pending={create.isPending} onSubmit={(input) => create.run(input)} />
        </>
    );
}

export function EditMedication({ id, onDone }: { id: string; onDone: (name: string) => void }) {
    const query = useQuery({ queryKey: qk.medication(id), queryFn: () => getMedication(id) });
    const update = useActionMutation(
        (input: Parameters<typeof updateMedication>[1]) => updateMedication(id, input),
        {
            invalidate: [["medications"], ["manager", "medications"], qk.pharmacy.stock],
            onSuccess: (m) => onDone(`${m.activeIngredient} ${m.concentration}`),
        },
    );
    return (
        <Loaded query={query} what="o medicamento">
            {(m) => (
                <>
                    {update.isError && (
                        <Notice tone="danger" title="Não foi possível salvar.">
                            <p>{update.error.message}</p>
                        </Notice>
                    )}
                    <MedicamentoForm
                        initial={{
                            activeIngredient: m.activeIngredient,
                            concentration: m.concentration,
                            pharmaceuticalForm: m.pharmaceuticalForm,
                            route: m.route,
                            dispensingUnit: m.dispensingUnit,
                            component: m.component,
                            therapeuticClass: m.therapeuticClass,
                            prescriptionType: m.prescriptionType,
                            storage: m.storage,
                            inRename: m.inRename,
                            inFarmaciaPopular: m.inFarmaciaPopular,
                            catmatCode: m.catmatCode,
                        }}
                        pending={update.isPending}
                        onSubmit={(input) => update.run(input)}
                    />
                </>
            )}
        </Loaded>
    );
}
