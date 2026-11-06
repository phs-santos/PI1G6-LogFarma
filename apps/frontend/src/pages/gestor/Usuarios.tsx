import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Button,
    ConfirmDialog,
    DataTable,
    Dialog,
    FilterBar,
    Notice,
    PageHeader,
    SelectField,
    TextField,
} from "@fatec-pi/style-guide";
import { listStaffAccounts, setStaffActive } from "../../api/manager";
import type { StaffAccount, StaffRole } from "../../api/types";
import { qk } from "../../app/queryKeys";
import { useSession } from "../../app/session";
import { useActionMutation } from "../../app/useActionMutation";
import { usePageTitle } from "../../app/usePageTitle";
import { normalizeText } from "../../lib/text";
import { Loaded } from "../../ui/Loaded";
import { ContaForm } from "./ContaForm";
import { ROLE_TEXT } from "./roleText";
import "./gestor.css";

const OCCUPATION = { pharmacist: "farmacêutico(a)", pharmacy_assistant: "auxiliar" };

/** Contas de quem trabalha na rede: lista com filtro por perfil; criar abre um diálogo. */
export function Usuarios() {
    usePageTitle("Usuários");
    const { user } = useSession();
    const [role, setRole] = useState<StaffRole | "">("");
    const [text, setText] = useState("");
    const [state, setState] = useState<"" | "active" | "inactive">("");
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState("");
    const [confirm, setConfirm] = useState<StaffAccount | null>(null);
    const query = useQuery({
        queryKey: qk.manager.users(role),
        queryFn: () => listStaffAccounts(role),
    });
    const toggle = useActionMutation(
        ({ id, active }: { id: string; active: boolean }) => setStaffActive(id, active),
        {
            invalidate: [["manager", "users"]],
            onSuccess: () => setConfirm(null),
        },
    );
    return (
        <>
            <PageHeader
                title="Usuários"
                description="Contas de quem trabalha na rede. Pacientes não aparecem aqui."
                actions={
                    <Button
                        onClick={() => {
                            setNotice("");
                            setCreating(true);
                        }}
                    >
                        Criar conta
                    </Button>
                }
            />
            <div aria-live="polite">{notice && <Notice tone="success" title={notice} />}</div>
            {toggle.isError && (
                <p className="sg-field__error" role="alert">
                    {toggle.error.message}
                </p>
            )}
            <Loaded query={query} what="os usuários">
                {(all) => {
                    const q = normalizeText(text);
                    const items = all.filter(
                        (a) =>
                            (!q ||
                                normalizeText(`${a.name} ${a.email} ${a.place ?? ""}`).includes(
                                    q,
                                )) &&
                            (state === "" || (state === "active") === a.active),
                    );
                    return (
                        <>
                            <FilterBar
                                label="Filtrar usuários"
                                summary={items.length === 1 ? "1 conta" : `${items.length} contas`}
                                active={Boolean(text || role || state)}
                                onClear={() => {
                                    setText("");
                                    setRole("");
                                    setState("");
                                }}
                            >
                                <TextField
                                    label="Buscar"
                                    type="search"
                                    placeholder="Nome, e-mail ou unidade"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                                <SelectField
                                    label="Perfil"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as StaffRole | "")}
                                    options={[
                                        { value: "", label: "Todos" },
                                        ...(Object.keys(ROLE_TEXT) as StaffRole[]).map((r) => ({
                                            value: r,
                                            label: ROLE_TEXT[r],
                                        })),
                                    ]}
                                />
                                <SelectField
                                    label="Situação"
                                    value={state}
                                    onChange={(e) =>
                                        setState(e.target.value as "" | "active" | "inactive")
                                    }
                                    options={[
                                        { value: "", label: "Todas" },
                                        { value: "active", label: "Ativas" },
                                        { value: "inactive", label: "Desativadas" },
                                    ]}
                                />
                            </FilterBar>
                            <DataTable
                                caption="Contas da equipe"
                                rowKey={(a) => a.id}
                                rows={items}
                                emptyText="Nenhuma conta com esses filtros."
                                columns={[
                                    {
                                        key: "nome",
                                        header: "Nome",
                                        render: (a) => (
                                            <>
                                                <strong>{a.name}</strong>
                                                <br />
                                                <span className="app-muted">{a.email}</span>
                                            </>
                                        ),
                                    },
                                    {
                                        key: "perfil",
                                        header: "Perfil",
                                        render: (a) =>
                                            a.occupation
                                                ? `${ROLE_TEXT[a.role]} (${OCCUPATION[a.occupation]})`
                                                : ROLE_TEXT[a.role],
                                    },
                                    { key: "onde", header: "Onde", render: (a) => a.place ?? "—" },
                                    {
                                        key: "situacao",
                                        header: "Situação",
                                        render: (a) => (
                                            <span
                                                className={`app-state${a.active ? "" : " app-state--off"}`}
                                            >
                                                {a.active ? "Ativa" : "Desativada"}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: "acao",
                                        header: "Ação",
                                        render: (a) =>
                                            a.id === user?.id ? (
                                                <span className="app-muted">Você</span>
                                            ) : a.active ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label={`Desativar ${a.name}`}
                                                    onClick={() => setConfirm(a)}
                                                >
                                                    Desativar
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    aria-label={`Reativar ${a.name}`}
                                                    loading={
                                                        toggle.isPending &&
                                                        toggle.variables?.id === a.id
                                                    }
                                                    onClick={() =>
                                                        toggle.run({ id: a.id, active: true })
                                                    }
                                                >
                                                    Reativar
                                                </Button>
                                            ),
                                    },
                                ]}
                            />
                        </>
                    );
                }}
            </Loaded>
            <Dialog
                open={creating}
                title="Criar conta"
                size="wide"
                onClose={() => setCreating(false)}
            >
                <ContaForm
                    onCreated={(name) => {
                        setCreating(false);
                        setNotice(`Conta criada para ${name}.`);
                    }}
                />
            </Dialog>
            <ConfirmDialog
                open={confirm !== null}
                title={`Desativar a conta de ${confirm?.name ?? ""}?`}
                confirmLabel="Sim, desativar"
                cancelLabel="Não, manter"
                danger
                loading={toggle.isPending}
                onConfirm={() => confirm && toggle.run({ id: confirm.id, active: false })}
                onClose={() => setConfirm(null)}
            >
                <p>A pessoa perde o acesso na hora. Dá para reativar depois.</p>
            </ConfirmDialog>
        </>
    );
}
