import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Checkbox,
    ChoiceGroup,
    ChoiceOption,
    ConfirmDialog,
    Notice,
    PageHeader,
    SelectField,
    TextField,
} from "@fatec-pi/style-guide";
import {
    addCaregiver,
    getProfile,
    listCaregivers,
    removeCaregiver,
    updateProfile,
} from "../../api/me";
import { listPharmacies } from "../../api/pharmacies";
import type {
    Address,
    CaregiverInput,
    PatientProfile,
    PriorityCategory,
    ProfilePatch,
} from "../../api/types";
import { requestLocation } from "../../app/geolocation";
import { qk } from "../../app/queryKeys";
import { SignOutButton } from "../../app/session";
import { useActionMutation } from "../../app/useActionMutation";
import { formatDate } from "../../lib/dates";
import { formatPhone, onlyDigits } from "../../lib/format";
import { maskCep, maskPhone } from "../../lib/masks";
import { Loaded } from "../../ui/Loaded";
import { AddressFields, cleanAddress, validateAddress, type AddressErrors } from "./AddressFields";
import { CONSENT_TEXT, PRIORITY_TEXT } from "./profileText";
import "./paciente.css";
import { usePageTitle } from "../../app/usePageTitle";

/**
 * Dados da paciente em cartões curtos: cada um mostra o que está salvo e só abre o formulário
 * quando a pessoa toca em "Editar" (menos rolagem e menos chance de mudar algo sem querer).
 */
export function MeusDados() {
    usePageTitle("Meus dados");
    const query = useQuery({ queryKey: qk.profile, queryFn: getProfile });
    return (
        <>
            <PageHeader title="Meus dados" />
            <Loaded query={query} what="seus dados">
                {(profile) => <ProfileSections profile={profile} />}
            </Loaded>
            <div className="app-section app-mobile-only">
                <SignOutButton variant="secondary" block />
            </div>
        </>
    );
}

function ProfileSections({ profile }: { profile: PatientProfile }) {
    return (
        <>
            <p className="app-lead">{profile.socialName ?? profile.fullName}</p>
            <div className="app-profile-grid">
                <ContactSection profile={profile} />
                <AddressSection profile={profile} />
                <UnitSection profile={profile} />
                <LocomotionSection profile={profile} />
                <LocationSection profile={profile} />
                <PrioritySection profile={profile} />
            </div>
            <CaregiversSection />
        </>
    );
}

interface SectionProps {
    profile: PatientProfile;
}

/** Cartão de um assunto: título, botão de ação à direita e o conteúdo (resumo ou formulário). */
function ProfileCard(props: {
    id: string;
    title: string;
    action?: ReactNode;
    wide?: boolean;
    children: ReactNode;
}) {
    return (
        <section
            className={`app-profile-card${props.wide ? " app-profile-card--wide" : ""}`}
            aria-labelledby={props.id}
        >
            <div className="app-profile-card__head">
                <h2 id={props.id}>{props.title}</h2>
                {props.action}
            </div>
            {props.children}
        </section>
    );
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <Button variant="secondary" aria-label={label} onClick={onClick}>
            Editar
        </Button>
    );
}

/**
 * Salvar de uma seção: o retorno ("Dados salvos." ou o erro) aparece dentro dela; cada envio
 * limpa o retorno anterior. Unidade e localização mudam "Onde tem", por isso a
 * disponibilidade também é recarregada.
 */
function useProfileSave(onDone?: () => void) {
    const client = useQueryClient();
    const [message, setMessage] = useState("");
    const save = useActionMutation((patch: ProfilePatch) => updateProfile(patch), {
        invalidate: [qk.me, ["availability"]],
        onSuccess: (updated) => {
            client.setQueryData(qk.profile, updated);
            setMessage("Dados salvos.");
            onDone?.();
        },
    });
    const run = (patch: ProfilePatch) => {
        setMessage("");
        save.reset();
        save.run(patch);
    };
    const clear = () => {
        setMessage("");
        save.reset();
    };
    const feedback = (
        <div aria-live="polite">
            {message && <Notice tone="success" title={message} />}
            {save.isError && (
                <p className="sg-field__error" role="alert">
                    {save.error.message}
                </p>
            )}
        </div>
    );
    return { run, clear, pending: save.isPending, feedback };
}

/** Cartão com formulário: abrir limpa o retorno anterior; salvar com sucesso fecha. */
function useEditableSave(onSaved?: () => void) {
    const [editing, setEditing] = useState(false);
    const save = useProfileSave(() => {
        setEditing(false);
        onSaved?.();
    });
    return {
        ...save,
        editing,
        open: () => {
            save.clear();
            setEditing(true);
        },
        close: () => setEditing(false),
    };
}

function FormButtons({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
    return (
        <div className="app-profile-card__buttons">
            <Button type="submit" loading={saving}>
                Salvar
            </Button>
            <Button variant="ghost" onClick={onCancel}>
                Cancelar
            </Button>
        </div>
    );
}

function ContactSection({ profile }: SectionProps) {
    const edit = useEditableSave();
    const { run, pending, feedback } = edit;
    const [phone, setPhone] = useState(formatPhone(profile.phone));
    const [phoneError, setPhoneError] = useState("");
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const digits = onlyDigits(phone);
        const bad = digits.length < 10 || digits.length > 11;
        setPhoneError(bad ? "Digite o telefone com DDD." : "");
        if (!bad) run({ phone: digits });
    };
    return (
        <ProfileCard
            id="contato"
            title="Contato"
            action={
                !edit.editing && (
                    <EditButton
                        label="Editar contato"
                        onClick={() => {
                            setPhone(formatPhone(profile.phone));
                            edit.open();
                        }}
                    />
                )
            }
        >
            {edit.editing ? (
                <form onSubmit={submit} noValidate>
                    <TextField
                        label="Telefone com DDD"
                        type="tel"
                        value={phone}
                        error={phoneError || undefined}
                        onChange={(e) => setPhone(maskPhone(e.target.value))}
                    />
                    <FormButtons saving={pending} onCancel={edit.close} />
                </form>
            ) : (
                <p className="app-profile-card__value">{formatPhone(profile.phone)}</p>
            )}
            {feedback}
        </ProfileCard>
    );
}

function addressLines(a: Address): [string, string] {
    return [
        `${a.street}, ${a.number} — ${a.district}`,
        `${a.city}/${a.state} · CEP ${maskCep(a.zip)}`,
    ];
}

function AddressSection({ profile }: SectionProps) {
    const edit = useEditableSave();
    const { run, pending, feedback } = edit;
    const [address, setAddress] = useState<Address>(profile.address);
    const [errors, setErrors] = useState<AddressErrors>({});
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const found = validateAddress(address);
        setErrors(found);
        if (Object.keys(found).length === 0) run({ address: cleanAddress(address) });
    };
    const [line1, line2] = addressLines(profile.address);
    return (
        <ProfileCard
            id="endereco"
            title="Endereço"
            action={
                !edit.editing && (
                    <EditButton
                        label="Editar endereço"
                        onClick={() => {
                            setAddress(profile.address);
                            setErrors({});
                            edit.open();
                        }}
                    />
                )
            }
        >
            {edit.editing ? (
                <form onSubmit={submit} noValidate>
                    <AddressFields value={address} errors={errors} onChange={setAddress} />
                    <FormButtons saving={pending} onCancel={edit.close} />
                </form>
            ) : (
                <p className="app-profile-card__value">
                    {line1}
                    <br />
                    <span className="app-unit__fact--muted">{line2}</span>
                </p>
            )}
            {feedback}
        </ProfileCard>
    );
}

function UnitSection({ profile }: SectionProps) {
    const edit = useEditableSave();
    const { run, pending, feedback } = edit;
    const units = useQuery({
        queryKey: qk.pharmacies,
        queryFn: listPharmacies,
        staleTime: 60 * 60_000,
    });
    const [unit, setUnit] = useState(profile.referencePharmacy.id);
    const options = (units.data ?? [])
        .filter((u) => u.kind === "ubs" || u.kind === "municipal_pharmacy")
        .map((u) => ({ value: u.id, label: u.name }));
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (unit === profile.referencePharmacy.id) edit.close();
        else run({ referencePharmacyId: unit });
    };
    return (
        <ProfileCard
            id="unidade"
            title="Sua unidade de saúde"
            action={
                !edit.editing && (
                    <Button
                        variant="secondary"
                        aria-label="Trocar unidade"
                        onClick={() => {
                            setUnit(profile.referencePharmacy.id);
                            edit.open();
                        }}
                    >
                        Trocar
                    </Button>
                )
            }
        >
            {edit.editing ? (
                <form onSubmit={submit} noValidate>
                    <SelectField
                        label="Unidade"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        options={
                            options.length
                                ? options
                                : [{ value: unit, label: profile.referencePharmacy.name }]
                        }
                    />
                    <FormButtons saving={pending} onCancel={edit.close} />
                </form>
            ) : (
                <p className="app-profile-card__value">{profile.referencePharmacy.name}</p>
            )}
            {feedback}
        </ProfileCard>
    );
}

function LocomotionSection({ profile }: SectionProps) {
    const { run, pending, feedback } = useProfileSave();
    return (
        <ProfileCard id="locomocao" title="Locomoção">
            <Checkbox
                label="Tenho dificuldade para me locomover"
                checked={profile.mobilityLimited}
                disabled={pending}
                onChange={(e) => run({ mobilityLimited: e.target.checked })}
            />
            {feedback}
        </ProfileCard>
    );
}

function LocationSection({ profile }: SectionProps) {
    const { run: onSave, pending: saving, feedback } = useProfileSave();
    const [asking, setAsking] = useState(false);
    const [denied, setDenied] = useState(false);
    const has = profile.latitude !== null && profile.longitude !== null;
    const update = async () => {
        setAsking(true);
        const found = await requestLocation();
        setAsking(false);
        setDenied(found === null);
        if (found) onSave({ latitude: found.latitude, longitude: found.longitude });
    };
    return (
        <ProfileCard id="localizacao" title="Localização">
            <p>
                {has
                    ? "Usamos sua localização só para mostrar a distância até as unidades."
                    : "Sem localização: as distâncias não aparecem, mas o mapa abre pelo endereço da unidade."}
            </p>
            <p role="status">
                {denied ? "Não foi possível pegar a localização. Seguimos sem ela." : ""}
            </p>
            <div className="app-profile-card__buttons">
                <Button
                    variant="secondary"
                    loading={asking || saving}
                    onClick={() => void update()}
                >
                    {has ? "Atualizar minha localização" : "Usar minha localização"}
                </Button>
                {has && (
                    <Button
                        variant="ghost"
                        onClick={() => onSave({ latitude: null, longitude: null })}
                    >
                        Remover
                    </Button>
                )}
            </div>
            {feedback}
        </ProfileCard>
    );
}

/** Escolha "nenhuma": a pessoa não informa condição (é o padrão). */
type PriorityChoice = PriorityCategory | "none";

function PrioritySection({ profile }: SectionProps) {
    const [confirming, setConfirming] = useState(false);
    const edit = useEditableSave(() => setConfirming(false));
    const { run, pending, feedback } = edit;
    const [choice, setChoice] = useState<PriorityChoice>("none");
    const [consent, setConsent] = useState(false);
    const current = profile.priority;
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (choice === "none") edit.close();
        else if (consent) run({ priority: { category: choice, consent: true } });
    };
    return (
        <ProfileCard
            id="prioridade"
            title="Prioridade na lista de espera"
            wide
            action={
                !current &&
                !edit.editing && (
                    <Button
                        variant="secondary"
                        aria-label="Informar condição de saúde"
                        onClick={() => {
                            setChoice("none");
                            setConsent(false);
                            edit.open();
                        }}
                    >
                        Informar
                    </Button>
                )
            }
        >
            {current ? (
                <>
                    <p className="app-profile-card__value">{PRIORITY_TEXT[current.category]}</p>
                    <p className="app-unit__fact--muted">
                        Você autorizou em {formatDate(current.consentAt.slice(0, 10))}.
                    </p>
                    <Button variant="danger" onClick={() => setConfirming(true)}>
                        Retirar consentimento
                    </Button>
                    <ConfirmDialog
                        open={confirming}
                        title="Retirar o consentimento?"
                        confirmLabel="Sim, retirar"
                        cancelLabel="Não, manter"
                        danger
                        loading={pending}
                        onConfirm={() => {
                            run({ priority: { revoke: true } });
                        }}
                        onClose={() => setConfirming(false)}
                    >
                        <p>
                            A informação é apagada e você deixa de ter prioridade na lista de
                            espera.
                        </p>
                        {confirming && feedback}
                    </ConfirmDialog>
                </>
            ) : edit.editing ? (
                <form onSubmit={submit} noValidate>
                    <ChoiceGroup legend="Possui alguma condição listada abaixo?">
                        {(Object.keys(PRIORITY_TEXT) as PriorityCategory[]).map((c) => (
                            <ChoiceOption
                                key={c}
                                name="priority"
                                label={PRIORITY_TEXT[c]}
                                checked={choice === c}
                                onChange={() => setChoice(c)}
                            />
                        ))}
                        <ChoiceOption
                            name="priority"
                            label="Não tenho / prefiro não dizer"
                            checked={choice === "none"}
                            onChange={() => setChoice("none")}
                        />
                    </ChoiceGroup>
                    {choice !== "none" && (
                        <Checkbox
                            label={CONSENT_TEXT}
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                        />
                    )}
                    <div className="app-profile-card__buttons">
                        <Button
                            type="submit"
                            disabled={choice !== "none" && !consent}
                            loading={pending}
                        >
                            Salvar
                        </Button>
                        <Button variant="ghost" onClick={edit.close}>
                            Cancelar
                        </Button>
                    </div>
                </form>
            ) : (
                <p>
                    Nenhuma condição informada. Pessoas com doença crônica, câncer ou doença rara
                    têm prioridade na lista de espera.
                </p>
            )}
            {!confirming && feedback}
        </ProfileCard>
    );
}

const EMPTY_CAREGIVER: CaregiverInput = { fullName: "", document: "", relationship: "", phone: "" };

function CaregiversSection() {
    const query = useQuery({ queryKey: qk.caregivers, queryFn: listCaregivers });
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState<CaregiverInput>(EMPTY_CAREGIVER);
    const [error, setError] = useState("");
    const add = useActionMutation(addCaregiver, {
        invalidate: [qk.caregivers],
        onSuccess: () => {
            setForm(EMPTY_CAREGIVER);
            setAdding(false);
        },
    });
    const remove = useActionMutation(removeCaregiver, { invalidate: [qk.caregivers] });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const input = {
            fullName: form.fullName.trim(),
            document: onlyDigits(form.document),
            relationship: form.relationship.trim(),
            phone: onlyDigits(form.phone),
        };
        if (
            input.fullName.length < 3 ||
            input.document.length < 5 ||
            input.relationship.length < 2 ||
            input.phone.length < 10
        ) {
            setError("Preencha nome, documento, parentesco e telefone com DDD.");
            return;
        }
        setError("");
        add.run(input);
    };
    const field = (
        key: keyof CaregiverInput,
        label: string,
        extra: Record<string, unknown> = {},
    ) => (
        <TextField
            label={label}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            {...extra}
        />
    );
    return (
        <ProfileCard
            id="responsaveis"
            title="Quem pode retirar ou receber por você"
            wide
            action={
                !adding && (
                    <Button
                        variant="secondary"
                        aria-label="Adicionar responsável"
                        onClick={() => {
                            setError("");
                            add.reset();
                            setAdding(true);
                        }}
                    >
                        Adicionar
                    </Button>
                )
            }
        >
            <Loaded query={query} what="os responsáveis">
                {(items) =>
                    items.length === 0 ? (
                        <p>Ninguém cadastrado. Só você pode retirar ou receber.</p>
                    ) : (
                        <ul className="app-profile-people">
                            {items.map((c) => (
                                <li key={c.id}>
                                    <span>
                                        <strong>
                                            {c.fullName} ({c.relationship})
                                        </strong>
                                        <br />
                                        <span className="app-unit__fact--muted">
                                            {formatPhone(c.phone)}
                                        </span>
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Remover ${c.fullName}`}
                                        loading={remove.isPending && remove.variables === c.id}
                                        onClick={() => remove.run(c.id)}
                                    >
                                        Remover
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )
                }
            </Loaded>
            {adding && (
                <form onSubmit={submit} noValidate className="app-profile-card__form">
                    <h3>Novo responsável</h3>
                    {field("fullName", "Nome completo")}
                    {field("document", "Documento (RG ou CPF)", { inputMode: "numeric" })}
                    {field("relationship", "Parentesco", { hint: "Por exemplo: filha, vizinho." })}
                    <TextField
                        label="Telefone do responsável"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                    />
                    {(error || add.isError) && (
                        <p className="sg-field__error" role="alert">
                            {error || add.error?.message}
                        </p>
                    )}
                    <div className="app-profile-card__buttons">
                        <Button type="submit" loading={add.isPending}>
                            Salvar responsável
                        </Button>
                        <Button variant="ghost" onClick={() => setAdding(false)}>
                            Cancelar
                        </Button>
                    </div>
                </form>
            )}
        </ProfileCard>
    );
}
