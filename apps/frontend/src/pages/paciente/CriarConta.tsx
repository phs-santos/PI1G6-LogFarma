import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, SelectField, TextField } from "@fatec-pi/style-guide";
import { getMe, register } from "../../api/auth";
import { listPharmacies } from "../../api/pharmacies";
import type { Address, PriorityCategory, RegisterPatientInput, Session } from "../../api/types";
import { requestLocation, type Coordinates } from "../../app/geolocation";
import { qk } from "../../app/queryKeys";
import { onlyDigits } from "../../lib/format";
import { Choice, Choices } from "../../ui/Choices";
import {
    AddressFields,
    cleanAddress,
    EMPTY_ADDRESS,
    validateAddress,
    type AddressErrors,
} from "./AddressFields";
import { CONSENT_TEXT, PRIORITY_TEXT } from "./profileText";
import "./paciente.css";

const TOTAL = 6;
const TITLES = [
    "Quem é você",
    "Cartão SUS e telefone",
    "Onde você mora",
    "Sua unidade de saúde",
    "Locomoção e prioridade",
    "E-mail e senha",
];

type Errors = Record<string, string | undefined>;

/** De qual passo é o campo que a API recusou. */
function stepOfApiError(message: string): number {
    if (/e-mail|senha/i.test(message)) return 6;
    if (/cart[aã]o sus|cns|cpf|telefone/i.test(message)) return 2;
    if (/endere|cep|rua|bairro/i.test(message)) return 3;
    if (/unidade/i.test(message)) return 4;
    if (/prioridade|consentimento/i.test(message)) return 5;
    return 6;
}

/** Cadastro da paciente em passos curtos, um assunto por tela. */
export function CriarConta() {
    const navigate = useNavigate();
    const client = useQueryClient();
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<Errors>({});
    const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
    const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
    const [f, setF] = useState({
        fullName: "",
        birthDate: "",
        cns: "",
        phone: "",
        referencePharmacyId: "",
        mobilityLimited: false,
        category: null as PriorityCategory | null,
        consent: false,
        email: "",
        password: "",
    });
    const [coords, setCoords] = useState<Coordinates | null>(null);
    const [locating, setLocating] = useState(false);
    const [locationMsg, setLocationMsg] = useState("");
    const [apiError, setApiError] = useState("");
    const heading = useRef<HTMLHeadingElement>(null);
    const firstRender = useRef(true);

    const units = useQuery({
        queryKey: qk.pharmacies,
        queryFn: listPharmacies,
        staleTime: 60 * 60_000,
    });
    const publicUnits = (units.data ?? []).filter(
        (u) => u.kind === "ubs" || u.kind === "municipal_pharmacy",
    );

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        heading.current?.focus();
    }, [step]);

    const signup = useMutation({
        mutationFn: async (input: RegisterPatientInput) => {
            await register(input);
            return getMe();
        },
        onSuccess: (session) => {
            client.setQueryData<Session | null>(qk.me, session);
            navigate("/", { replace: true });
        },
        onError: (err) => {
            setApiError(err.message);
            setStep(stepOfApiError(err.message));
        },
    });

    const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
        setF((old) => ({ ...old, [key]: value }));

    function validate(n: number): boolean {
        const e: Errors = {};
        if (n === 1) {
            if (f.fullName.trim().length < 3) e.fullName = "Escreva seu nome completo.";
            if (!f.birthDate) e.birthDate = "Informe a data de nascimento.";
        }
        if (n === 2) {
            if (onlyDigits(f.cns).length !== 15) e.cns = "O Cartão SUS tem 15 números.";
            const phone = onlyDigits(f.phone).length;
            if (phone < 10 || phone > 11) e.phone = "Digite o telefone com DDD.";
        }
        if (n === 3) {
            const a = validateAddress(address);
            setAddressErrors(a);
            if (Object.keys(a).length > 0) return false;
        }
        if (n === 4 && !f.referencePharmacyId) e.referencePharmacyId = "Escolha a sua unidade.";
        if (n === 5 && f.category && !f.consent)
            e.consent = "Para ter prioridade, marque a autorização.";
        if (n === 6) {
            if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Escreva um e-mail válido.";
            if (f.password.length < 8)
                e.password = "A senha precisa ter pelo menos 8 letras ou números.";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    const askLocation = async () => {
        setLocating(true);
        const found = await requestLocation();
        setLocating(false);
        setCoords(found);
        setLocationMsg(
            found
                ? "Pronto, vamos mostrar a distância até as unidades."
                : "Tudo bem, seguimos sem a sua localização.",
        );
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        setApiError("");
        if (!validate(step)) return;
        if (step < TOTAL) {
            setStep(step + 1);
            return;
        }
        const input: RegisterPatientInput = {
            email: f.email.trim(),
            password: f.password,
            fullName: f.fullName.trim(),
            birthDate: f.birthDate,
            cns: onlyDigits(f.cns),
            phone: onlyDigits(f.phone),
            address: cleanAddress(address),
            referencePharmacyId: f.referencePharmacyId,
            mobilityLimited: f.mobilityLimited,
            ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
            ...(f.category ? { priority: { category: f.category, consent: true as const } } : {}),
        };
        signup.mutate(input);
    };

    const back = () => {
        setErrors({});
        setApiError("");
        if (step === 1) navigate("/entrar");
        else setStep(step - 1);
    };

    return (
        <div className="sg-mobile app-mobile">
            <main className="app-mobile__main">
                <h1>Criar conta</h1>
                <p className="app-lead">
                    Passo {step} de {TOTAL}
                </p>
                <form onSubmit={onSubmit} noValidate>
                    <h2 ref={heading} tabIndex={-1}>
                        {TITLES[step - 1]}
                    </h2>

                    {step === 1 && (
                        <>
                            <TextField
                                label="Nome completo"
                                autoComplete="name"
                                value={f.fullName}
                                error={errors.fullName}
                                onChange={(e) => set("fullName", e.target.value)}
                            />
                            <TextField
                                label="Data de nascimento"
                                type="date"
                                value={f.birthDate}
                                error={errors.birthDate}
                                onChange={(e) => set("birthDate", e.target.value)}
                            />
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <TextField
                                label="Cartão SUS"
                                hint="Os 15 números do cartão."
                                inputMode="numeric"
                                value={f.cns}
                                error={errors.cns}
                                onChange={(e) => set("cns", e.target.value)}
                            />
                            <TextField
                                label="Telefone com DDD"
                                type="tel"
                                autoComplete="tel"
                                value={f.phone}
                                error={errors.phone}
                                onChange={(e) => set("phone", e.target.value)}
                            />
                        </>
                    )}
                    {step === 3 && (
                        <AddressFields
                            value={address}
                            errors={addressErrors}
                            onChange={setAddress}
                        />
                    )}
                    {step === 4 && (
                        <>
                            <SelectField
                                label="Sua unidade de saúde"
                                hint="A UBS ou farmácia municipal onde você costuma pegar remédio."
                                value={f.referencePharmacyId}
                                error={errors.referencePharmacyId}
                                onChange={(e) => set("referencePharmacyId", e.target.value)}
                                options={[
                                    {
                                        value: "",
                                        label: units.isPending
                                            ? "Carregando…"
                                            : "Escolha a unidade",
                                    },
                                    ...publicUnits.map((u) => ({ value: u.id, label: u.name })),
                                ]}
                            />
                            <section className="app-section" aria-labelledby="localizacao">
                                <h3 id="localizacao">Sua localização (opcional)</h3>
                                <p>Usamos só para mostrar a distância até as unidades.</p>
                                <Button
                                    variant="secondary"
                                    block
                                    loading={locating}
                                    onClick={() => void askLocation()}
                                >
                                    Usar minha localização
                                </Button>
                                <p role="status">{locationMsg}</p>
                            </section>
                        </>
                    )}
                    {step === 5 && (
                        <>
                            <Checkbox
                                label="Tenho dificuldade para me locomover"
                                hint="Assim já sugerimos receber em casa."
                                checked={f.mobilityLimited}
                                onChange={(e) => set("mobilityLimited", e.target.checked)}
                            />
                            <Choices legend="Você tem alguma destas condições? Quem tem recebe primeiro quando o remédio chega.">
                                <Choice
                                    name="priority"
                                    label="Prefiro não informar"
                                    checked={f.category === null}
                                    onChange={() => set("category", null)}
                                />
                                {(Object.keys(PRIORITY_TEXT) as PriorityCategory[]).map((c) => (
                                    <Choice
                                        key={c}
                                        name="priority"
                                        label={PRIORITY_TEXT[c]}
                                        checked={f.category === c}
                                        onChange={() => set("category", c)}
                                    />
                                ))}
                            </Choices>
                            {f.category && (
                                <>
                                    <Checkbox
                                        label={CONSENT_TEXT}
                                        checked={f.consent}
                                        onChange={(e) => set("consent", e.target.checked)}
                                    />
                                    {errors.consent && (
                                        <p className="sg-field__error">{errors.consent}</p>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    {step === 6 && (
                        <>
                            <TextField
                                label="E-mail"
                                type="email"
                                autoComplete="email"
                                value={f.email}
                                error={errors.email}
                                onChange={(e) => set("email", e.target.value)}
                            />
                            <TextField
                                label="Senha"
                                type="password"
                                autoComplete="new-password"
                                hint="Pelo menos 8 letras ou números."
                                value={f.password}
                                error={errors.password}
                                onChange={(e) => set("password", e.target.value)}
                            />
                        </>
                    )}

                    {apiError && (
                        <p className="sg-field__error" role="alert">
                            {apiError}
                        </p>
                    )}
                    <div className="app-steps">
                        <Button type="submit" block size="lg" loading={signup.isPending}>
                            {step < TOTAL ? "Continuar" : "Criar conta"}
                        </Button>
                        <Button variant="secondary" block onClick={back}>
                            Voltar
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}
