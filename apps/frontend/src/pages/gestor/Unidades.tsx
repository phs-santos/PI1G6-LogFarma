import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { listPharmacies } from "../../api/pharmacies";
import type { PharmacyKind } from "../../api/types";
import { qk } from "../../app/queryKeys";
import { usePageTitle } from "../../app/usePageTitle";
import { formatPhone } from "../../lib/format";
import { normalizeText } from "../../lib/text";
import { Loaded } from "../../ui/Loaded";
import { KIND_TEXT, NETWORK_TEXT } from "./pharmacyText";
import { UnidadeForm } from "./UnidadeForm";
import "./gestor.css";

/** Unidades da rede: lista com filtro; cadastrar abre um diálogo. */
export function Unidades() {
    usePageTitle("Unidades");
    const query = useQuery({ queryKey: qk.pharmacies, queryFn: listPharmacies });
    const [text, setText] = useState("");
    const [kind, setKind] = useState<PharmacyKind | "">("");
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState("");
    return (
        <>
            <PageHeader
                title="Unidades"
                description="UBS, farmácias da rede e Farmácia Popular, com endereço e horário."
                actions={
                    <Button
                        onClick={() => {
                            setNotice("");
                            setCreating(true);
                        }}
                    >
                        Cadastrar unidade
                    </Button>
                }
            />
            <div aria-live="polite">{notice && <Notice tone="success" title={notice} />}</div>
            <Loaded query={query} what="as unidades">
                {(all) => {
                    const q = normalizeText(text);
                    const items = all.filter(
                        (u) =>
                            (!q || normalizeText(`${u.name} ${u.address}`).includes(q)) &&
                            (!kind || u.kind === kind),
                    );
                    return (
                        <>
                            <FilterBar
                                label="Filtrar unidades"
                                summary={
                                    items.length === 1 ? "1 unidade" : `${items.length} unidades`
                                }
                                active={Boolean(text || kind)}
                                onClear={() => {
                                    setText("");
                                    setKind("");
                                }}
                            >
                                <TextField
                                    label="Buscar"
                                    type="search"
                                    placeholder="Nome ou endereço"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                                <SelectField
                                    label="Tipo"
                                    value={kind}
                                    onChange={(e) => setKind(e.target.value as PharmacyKind | "")}
                                    options={[
                                        { value: "", label: "Todos" },
                                        ...(Object.keys(KIND_TEXT) as PharmacyKind[]).map((k) => ({
                                            value: k,
                                            label: KIND_TEXT[k],
                                        })),
                                    ]}
                                />
                            </FilterBar>
                            <DataTable
                                caption="Unidades da rede"
                                rowKey={(u) => u.id}
                                rows={items}
                                emptyText="Nenhuma unidade com esses filtros."
                                columns={[
                                    {
                                        key: "nome",
                                        header: "Unidade",
                                        render: (u) => (
                                            <>
                                                <strong>{u.name}</strong>
                                                <br />
                                                <span className="app-muted">
                                                    {KIND_TEXT[u.kind]}
                                                </span>
                                            </>
                                        ),
                                    },
                                    {
                                        key: "rede",
                                        header: "Rede",
                                        render: (u) => NETWORK_TEXT[u.network],
                                    },
                                    {
                                        key: "endereco",
                                        header: "Endereço",
                                        render: (u) => u.address,
                                    },
                                    {
                                        key: "telefone",
                                        header: "Telefone",
                                        render: (u) => formatPhone(u.phone),
                                    },
                                    {
                                        key: "horario",
                                        header: "Horário",
                                        render: (u) => u.openingHours,
                                    },
                                ]}
                            />
                        </>
                    );
                }}
            </Loaded>
            <Dialog
                open={creating}
                title="Cadastrar unidade"
                size="wide"
                onClose={() => setCreating(false)}
            >
                <UnidadeForm
                    onCreated={(name) => {
                        setCreating(false);
                        setNotice(`${name} cadastrada.`);
                    }}
                />
            </Dialog>
        </>
    );
}
