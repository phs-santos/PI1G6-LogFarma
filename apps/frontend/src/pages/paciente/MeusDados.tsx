import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Checkbox,
    Notice,
    SelectField,
    TextField,
    ChoiceGroup,
    ChoiceOption,
    ConfirmDialog,
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
import { Loaded } from "../../ui/Loaded";
import { AddressFields, cleanAddress, validateAddress, type AddressErrors } from "./AddressFields";
import { CONSENT_TEXT, PRIORITY_TEXT } from "./profileText";
import "./paciente.css";
import { usePageTitle } from "../../app/usePageTitle";

/** Dados da paciente: contato, endereço, unidade, localização, responsáveis e prioridade. */
export function MeusDados() {
    usePageTitle("Meus dados");
    const query = useQuery({ queryKey: qk.profile, queryFn: getProfile });
    return (
        <>
            <h1>Meus dados</h1>
            <Loaded query={query} what="seus dados">
                {(profile) => <ProfileSections profile={profile} />}
            </Loaded>
            <div className="app-section">
                <SignOutButton variant="secondary" block />
            </div>
        </>
    );
}

function ProfileSections({ profile }: { profile: PatientProfile }) {
    return (
        <>
            <p className="app-lead">{profile.socialName ?? profile.fullName}</p>
            <ContactSection profile={profile} />
            <UnitSection profile={profile} />
            <LocationSection profile={profile} />
            <LocomotionSection profile={profile} />
            <PrioritySection profile={profile} />
            <CaregiversSection />
        </>
    );
}

interface SectionProps {
    profile: PatientProfile;
}

/**
 * Salvar de uma seção: o retorno ("Dados salvos." ou o erro) aparece dentro dela, perto do
 * botão; cada envio limpa o retorno anterior. Unidade e localização mudam "Onde tem",
 * por isso a disponibilidade também é recarregada.
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
    return { run, pending: save.isPending, feedback };
}

function LocomotionSection({ profile }: SectionProps) {
    const { run, pending, feedback } = useProfileSave();
    return (
        <section className="app-section" aria-labelledby="locomocao">
            <h2 id="locomocao">Locomoção</h2>
            <Checkbox
                label="Tenho dificuldade para me locomover"
                checked={profile.mobilityLimited}
                disabled={pending}
                onChange={(e) => run({ mobilityLimited: e.target.checked })}
            />
            {feedback}
        </section>
    );
}

function ContactSection({ profile }: SectionProps) {
    const { run: onSave, pending: saving, feedback } = useProfileSave();
    const [phone, setPhone] = useState(formatPhone(profile.phone));
    const [address, setAddress] = useState<Address>(profile.address);
    const [errors, setErrors] = useState<AddressErrors>({});
    const [phoneError, setPhoneError] = useState("");
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const a = validateAddress(address);
        const digits = onlyDigits(phone);
        const badPhone = digits.length < 10 || digits.length > 11;
        setErrors(a);
        setPhoneError(badPhone ? "Digite o telefone com DDD." : "");
        if (badPhone || Object.keys(a).length > 0) return;
        onSave({ phone: digits, address: cleanAddress(address) });
    };
    return (
        <section className="app-section" aria-labelledby="contato">
            <h2 id="contato">Contato e endereço</h2>
            <form onSubmit={submit} noValidate>
                <TextField
                    label="Telefone com DDD"
                    type="tel"
                    value={phone}
                    error={phoneError || undefined}
                    onChange={(e) => setPhone(e.target.value)}
                />
                <AddressFields value={address} errors={errors} onChange={setAddress} />
                <Button type="submit" block loading={saving}>
                    Salvar contato e endereço
                </Button>
            </form>
            {feedback}
        </section>
    );
}

function UnitSection({ profile }: SectionProps) {
    const { run: onSave, pending: saving, feedback } = useProfileSave();
    const units = useQuery({
        queryKey: qk.pharmacies,
        queryFn: listPharmacies,
        staleTime: 60 * 60_000,
    });
    const [unit, setUnit] = useState(profile.referencePharmacy.id);
    const options = (units.data ?? [])
        .filter((u) => u.kind === "ubs" || u.kind === "municipal_pharmacy")
        .map((u) => ({ value: u.id, label: u.name }));
    return (
        <section className="app-section" aria-labelledby="unidade">
            <h2 id="unidade">Sua unidade de saúde</h2>
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
            {unit !== profile.referencePharmacy.id && (
                <Button
                    block
                    loading={saving}
                    onClick={() => onSave({ referencePharmacyId: unit })}
                >
                    Salvar unidade
                </Button>
            )}
            {feedback}
        </section>
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
        <section className="app-section" aria-labelledby="localizacao">
            <h2 id="localizacao">Localização</h2>
            <p>
                {has
                    ? "Usamos sua localização só para mostrar a distância até as unidades."
                    : "Sem localização: as distâncias não aparecem, mas o mapa abre pelo endereço da unidade."}
            </p>
            <p role="status">
                {denied ? "Não foi possível pegar a localização. Seguimos sem ela." : ""}
            </p>
            <div className="app-steps">
                <Button
                    variant="secondary"
                    block
                    loading={asking || saving}
                    onClick={() => void update()}
                >
                    {has ? "Atualizar minha localização" : "Usar minha localização"}
                </Button>
                {has && (
                    <Button
                        variant="ghost"
                        block
                        onClick={() => onSave({ latitude: null, longitude: null })}
                    >
                        Remover minha localização
                    </Button>
                )}
            </div>
            {feedback}
        </section>
    );
}

function PrioritySection({ profile }: SectionProps) {
    const [confirming, setConfirming] = useState(false);
    const { run: onSave, pending: saving, feedback } = useProfileSave(() => setConfirming(false));
    const [category, setCategory] = useState<PriorityCategory | null>(null);
    const [consent, setConsent] = useState(false);
    const current = profile.priority;
    return (
        <section className="app-section" aria-labelledby="prioridade">
            <h2 id="prioridade">Prioridade na lista de espera</h2>
            {current ? (
                <>
                    <p className="app-status">{PRIORITY_TEXT[current.category]}</p>
                    <p className="app-unit__fact--muted">
                        Você autorizou em {formatDate(current.consentAt.slice(0, 10))}.
                    </p>
                    <Button variant="danger" block onClick={() => setConfirming(true)}>
                        Retirar consentimento
                    </Button>
                    <ConfirmDialog
                        open={confirming}
                        title="Retirar o consentimento?"
                        confirmLabel="Sim, retirar"
                        cancelLabel="Não, manter"
                        danger
                        loading={saving}
                        onConfirm={() => {
                            onSave({ priority: { revoke: true } });
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
            ) : (
                <>
                    <ChoiceGroup legend="Você tem alguma destas condições?">
                        {(Object.keys(PRIORITY_TEXT) as PriorityCategory[]).map((c) => (
                            <ChoiceOption
                                key={c}
                                name="priority"
                                label={PRIORITY_TEXT[c]}
                                checked={category === c}
                                onChange={() => setCategory(c)}
                            />
                        ))}
                    </ChoiceGroup>
                    {category && (
                        <>
                            <Checkbox
                                label={CONSENT_TEXT}
                                checked={consent}
                                onChange={(e) => setConsent(e.target.checked)}
                            />
                            <Button
                                block
                                disabled={!consent}
                                loading={saving}
                                onClick={() => onSave({ priority: { category, consent: true } })}
                            >
                                Salvar prioridade
                            </Button>
                        </>
                    )}
                </>
            )}
            {!confirming && feedback}
        </section>
    );
}

const EMPTY_CAREGIVER: CaregiverInput = { fullName: "", document: "", relationship: "", phone: "" };

function CaregiversSection() {
    const query = useQuery({ queryKey: qk.caregivers, queryFn: listCaregivers });
    const [form, setForm] = useState<CaregiverInput>(EMPTY_CAREGIVER);
    const [error, setError] = useState("");
    const add = useActionMutation(addCaregiver, {
        invalidate: [qk.caregivers],
        onSuccess: () => setForm(EMPTY_CAREGIVER),
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
        <section className="app-section" aria-labelledby="responsaveis">
            <h2 id="responsaveis">Quem pode retirar ou receber por você</h2>
            <Loaded query={query} what="os responsáveis">
                {(items) =>
                    items.length === 0 ? (
                        <p>Ninguém cadastrado. Só você pode retirar ou receber.</p>
                    ) : (
                        <ul className="app-units">
                            {items.map((c) => (
                                <li key={c.id}>
                                    <strong>
                                        {c.fullName} ({c.relationship})
                                    </strong>
                                    <span>{formatPhone(c.phone)}</span>
                                    <Button
                                        variant="ghost"
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
            <form onSubmit={submit} noValidate className="app-section">
                <h3>Adicionar responsável</h3>
                {field("fullName", "Nome completo")}
                {field("document", "Documento (RG ou CPF)", { inputMode: "numeric" })}
                {field("relationship", "Parentesco", { hint: "Por exemplo: filha, vizinho." })}
                {field("phone", "Telefone do responsável", { type: "tel" })}
                {(error || add.isError) && (
                    <p className="sg-field__error" role="alert">
                        {error || add.error?.message}
                    </p>
                )}
                <Button type="submit" variant="secondary" block loading={add.isPending}>
                    Adicionar responsável
                </Button>
            </form>
        </section>
    );
}
