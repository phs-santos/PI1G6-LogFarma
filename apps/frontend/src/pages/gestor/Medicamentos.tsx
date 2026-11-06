import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
    Button,
    DataTable,
    Dialog,
    FilterBar,
    Notice,
    PageHeader,
    SelectField,
    TextField,
} from "@fatec-pi/style-guide";
import { listMedicationsPage } from "../../api/manager";
import type { MedicationComponent, MedicationSummary } from "../../api/types";
import { qk } from "../../app/queryKeys";
import { usePageTitle } from "../../app/usePageTitle";
import { useDebounced } from "../../lib/useDebounced";
import { Loaded } from "../../ui/Loaded";
import { CreateMedication, EditMedication } from "../farmacia/MedicamentoDialogs";
import {
    COMPONENT_TEXT,
    FORM_TEXT,
    PRESCRIPTION_TEXT,
    STORAGE_TEXT,
} from "../farmacia/medicationText";
import "./gestor.css";

/** Catálogo da rede: lista com busca e páginas; cadastrar e editar abrem um diálogo. */
export function Medicamentos() {
    usePageTitle("Medicamentos");
    const [params, setParams] = useSearchParams();
    const search = params.get("busca") ?? "";
    const component = (params.get("componente") ?? "") as MedicationComponent | "";
    const page = Math.max(1, Number(params.get("pagina")) || 1);
    const [text, setText] = useState(search);
    const typed = useDebounced(text.trim());
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<MedicationSummary | null>(null);
    const [notice, setNotice] = useState("");
    const query = useQuery({
        queryKey: qk.manager.medications(search, page, component),
        queryFn: () => listMedicationsPage(search, page, component),
        placeholderData: keepPreviousData,
    });
    /** Filtros e página ficam no endereço (dá para voltar e compartilhar). */
    const go = (next: { busca?: string; componente?: string; pagina?: number }) => {
        const p = new URLSearchParams();
        const b = next.busca ?? search;
        const c = next.componente ?? component;
        if (b) p.set("busca", b);
        if (c) p.set("componente", c);
        if ((next.pagina ?? 1) > 1) p.set("pagina", String(next.pagina));
        setParams(p, { replace: true });
    };
    // Busca enquanto digita: quando a pessoa para de digitar, volta para a página 1.
    useEffect(() => {
        if (typed !== search) go({ busca: typed, pagina: 1 });
        // Só reage ao texto digitado (go muda a cada desenho).
    }, [typed]);
    return (
        <>
            <PageHeader
                title="Medicamentos"
                description="Catálogo da rede (RENAME e itens próprios)."
                actions={
                    <Button
                        onClick={() => {
                            setNotice("");
                            setCreating(true);
                        }}
                    >
                        Cadastrar medicamento
                    </Button>
                }
            />
            <div aria-live="polite">{notice && <Notice tone="success" title={notice} />}</div>
            <Loaded query={query} what="os medicamentos">
                {(data) => {
                    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
                    return (
                        <>
                            <FilterBar
                                label="Filtrar medicamentos"
                                summary={
                                    data.total === 1
                                        ? "1 medicamento"
                                        : `${data.total} medicamentos`
                                }
                                active={Boolean(search || component)}
                                onClear={() => {
                                    setText("");
                                    setParams(new URLSearchParams(), { replace: true });
                                }}
                            >
                                <TextField
                                    label="Buscar"
                                    type="search"
                                    placeholder="Nome do remédio, ex.: losartana"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                                <SelectField
                                    label="Componente do SUS"
                                    value={component}
                                    onChange={(e) => go({ componente: e.target.value, pagina: 1 })}
                                    options={[
                                        { value: "", label: "Todos" },
                                        ...(
                                            Object.keys(COMPONENT_TEXT) as MedicationComponent[]
                                        ).map((c) => ({ value: c, label: COMPONENT_TEXT[c] })),
                                    ]}
                                />
                            </FilterBar>
                            <DataTable
                                caption="Catálogo de medicamentos"
                                rowKey={(m) => m.id}
                                rows={data.items}
                                emptyText="Nenhum medicamento encontrado."
                                columns={[
                                    {
                                        key: "nome",
                                        header: "Medicamento",
                                        render: (m) => <strong>{m.displayName}</strong>,
                                    },
                                    {
                                        key: "forma",
                                        header: "Forma",
                                        render: (m) => FORM_TEXT[m.pharmaceuticalForm],
                                    },
                                    {
                                        key: "componente",
                                        header: "Componente",
                                        render: (m) => COMPONENT_TEXT[m.component],
                                    },
                                    {
                                        key: "receita",
                                        header: "Receita",
                                        render: (m) => PRESCRIPTION_TEXT[m.prescriptionType],
                                    },
                                    {
                                        key: "conservacao",
                                        header: "Conservação",
                                        render: (m) => STORAGE_TEXT[m.storage],
                                    },
                                    {
                                        key: "acao",
                                        header: "Ação",
                                        render: (m) => (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                aria-label={`Editar ${m.displayName}`}
                                                onClick={() => {
                                                    setNotice("");
                                                    setEditing(m);
                                                }}
                                            >
                                                Editar
                                            </Button>
                                        ),
                                    },
                                ]}
                            />
                            {pages > 1 && (
                                <nav className="app-pager" aria-label="Páginas">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() => go({ pagina: page - 1 })}
                                    >
                                        Anterior
                                    </Button>
                                    <span>
                                        Página {page} de {pages}
                                    </span>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={page >= pages}
                                        onClick={() => go({ pagina: page + 1 })}
                                    >
                                        Próxima
                                    </Button>
                                </nav>
                            )}
                        </>
                    );
                }}
            </Loaded>
            <Dialog
                open={creating}
                title="Cadastrar medicamento"
                size="xl"
                onClose={() => setCreating(false)}
            >
                <CreateMedication
                    onDone={(name) => {
                        setCreating(false);
                        setNotice(`${name} cadastrado.`);
                    }}
                />
            </Dialog>
            <Dialog
                open={editing !== null}
                title={editing ? `Editar ${editing.displayName}` : "Editar medicamento"}
                size="xl"
                onClose={() => setEditing(null)}
            >
                {editing && (
                    <EditMedication
                        id={editing.id}
                        onDone={(name) => {
                            setEditing(null);
                            setNotice(`${name} atualizado.`);
                        }}
                    />
                )}
            </Dialog>
        </>
    );
}
