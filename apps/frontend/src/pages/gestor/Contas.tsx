import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Notice, SelectField, TextField } from "@fatec-pi/style-guide";
import { createAccount } from "../../api/manager";
import { listPharmacies, listSuppliers } from "../../api/pharmacies";
import type { CreateAccountInput, StaffOccupation } from "../../api/types";
import { qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { onlyDigits } from "../../lib/format";
import { ManagerTabs } from "./ManagerTabs";
import "./gestor.css";
import { usePageTitle } from "../../app/usePageTitle";

type Role = CreateAccountInput["role"];

const ROLE_TEXT: Record<Role, string> = {
    pharmacy_staff: "Profissional da farmácia",
    supplier_staff: "Atendente de fornecedor",
    courier: "Entregador",
    manager: "Gestor",
};

const EMPTY = {
    role: "" as Role | "",
    fullName: "",
    email: "",
    password: "",
    pharmacyId: "",
    occupation: "pharmacist" as StaffOccupation,
    crfNumber: "",
    crfState: "SP",
    supplierId: "",
    phone: "",
    deliveryProgram: "Programa municipal de entrega",
};

/** Contas de quem trabalha na rede (o paciente se cadastra sozinho). */
export function Contas() {
    usePageTitle("Criar conta de trabalho");
    const [f, setF] = useState(EMPTY);
    const [error, setError] = useState("");
    const [created, setCreated] = useState("");
    const pharmacies = useQuery({
        queryKey: qk.pharmacies,
        queryFn: listPharmacies,
        staleTime: 60 * 60_000,
    });
    const suppliers = useQuery({
        queryKey: qk.suppliers,
        queryFn: listSuppliers,
        staleTime: 60 * 60_000,
    });
    const create = useActionMutation(createAccount, {
        invalidate: [],
        onSuccess: () => {
            setCreated(`Conta criada para ${f.fullName.trim()}.`);
            setF(EMPTY);
        },
    });
    const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
        setF((old) => ({ ...old, [key]: value }));
    const publicUnits = (pharmacies.data ?? []).filter((p) => p.kind !== "pfpb");

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setCreated("");
        if (!f.role) return setError("Escolha o perfil.");
        if (
            f.fullName.trim().length < 3 ||
            !/^\S+@\S+\.\S+$/.test(f.email.trim()) ||
            f.password.length < 8
        ) {
            return setError(
                "Preencha nome, e-mail e uma senha inicial com pelo menos 8 caracteres.",
            );
        }
        const input: CreateAccountInput = {
            role: f.role,
            fullName: f.fullName.trim(),
            email: f.email.trim(),
            password: f.password,
        };
        if (f.role === "pharmacy_staff") {
            if (!f.pharmacyId) return setError("Escolha a unidade.");
            input.pharmacyId = f.pharmacyId;
            input.occupation = f.occupation;
            if (f.occupation === "pharmacist") {
                if (!f.crfNumber.trim() || !/^[A-Za-z]{2}$/.test(f.crfState.trim())) {
                    return setError("Farmacêutico precisa do número do CRF e da UF.");
                }
                input.crfNumber = f.crfNumber.trim();
                input.crfState = f.crfState.trim().toUpperCase();
            }
        }
        if (f.role === "supplier_staff") {
            if (!f.supplierId) return setError("Escolha o fornecedor.");
            input.supplierId = f.supplierId;
        }
        if (f.role === "courier") {
            const phone = onlyDigits(f.phone);
            if (phone.length < 10 || phone.length > 11 || f.deliveryProgram.trim().length < 3) {
                return setError("Entregador precisa de telefone com DDD e do programa de entrega.");
            }
            input.phone = phone;
            input.deliveryProgram = f.deliveryProgram.trim();
        }
        setError("");
        create.run(input);
    };

    return (
        <>
            <ManagerTabs />
            <h1>Criar conta</h1>
            <p>
                Para profissionais da farmácia, fornecedores, entregadores e gestores. Pacientes
                criam a própria conta pelo celular.
            </p>
            <div aria-live="polite">{created && <Notice tone="success" title={created} />}</div>
            <form className="app-account-form" onSubmit={submit} noValidate>
                <SelectField
                    label="Perfil"
                    value={f.role}
                    onChange={(e) => set("role", e.target.value as Role | "")}
                    options={[
                        { value: "", label: "Escolha o perfil" },
                        ...(Object.keys(ROLE_TEXT) as Role[]).map((r) => ({
                            value: r,
                            label: ROLE_TEXT[r],
                        })),
                    ]}
                />
                {f.role === "pharmacy_staff" && (
                    <>
                        <SelectField
                            label="Unidade"
                            value={f.pharmacyId}
                            onChange={(e) => set("pharmacyId", e.target.value)}
                            options={[
                                { value: "", label: "Escolha a unidade" },
                                ...publicUnits.map((p) => ({ value: p.id, label: p.name })),
                            ]}
                        />
                        <SelectField
                            label="Ocupação"
                            value={f.occupation}
                            onChange={(e) => set("occupation", e.target.value as StaffOccupation)}
                            options={[
                                { value: "pharmacist", label: "Farmacêutico" },
                                { value: "pharmacy_assistant", label: "Auxiliar de farmácia" },
                            ]}
                        />
                        {f.occupation === "pharmacist" && (
                            <>
                                <TextField
                                    label="Número do CRF"
                                    value={f.crfNumber}
                                    onChange={(e) => set("crfNumber", e.target.value)}
                                />
                                <TextField
                                    label="UF do CRF"
                                    maxLength={2}
                                    value={f.crfState}
                                    onChange={(e) => set("crfState", e.target.value)}
                                />
                            </>
                        )}
                    </>
                )}
                {f.role === "supplier_staff" && (
                    <SelectField
                        label="Fornecedor"
                        value={f.supplierId}
                        onChange={(e) => set("supplierId", e.target.value)}
                        options={[
                            { value: "", label: "Escolha o fornecedor" },
                            ...(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })),
                        ]}
                    />
                )}
                {f.role === "courier" && (
                    <>
                        <TextField
                            label="Telefone com DDD"
                            type="tel"
                            value={f.phone}
                            onChange={(e) => set("phone", e.target.value)}
                        />
                        <TextField
                            label="Programa de entrega"
                            value={f.deliveryProgram}
                            onChange={(e) => set("deliveryProgram", e.target.value)}
                        />
                    </>
                )}
                <TextField
                    label="Nome completo"
                    value={f.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                />
                <TextField
                    label="E-mail"
                    type="email"
                    value={f.email}
                    onChange={(e) => set("email", e.target.value)}
                />
                <TextField
                    label="Senha inicial"
                    type="password"
                    autoComplete="new-password"
                    hint="A pessoa usa esta senha no primeiro acesso."
                    value={f.password}
                    onChange={(e) => set("password", e.target.value)}
                />
                {(error || create.isError) && (
                    <p className="sg-field__error" role="alert">
                        {error || create.error?.message}
                    </p>
                )}
                <Button type="submit" size="lg" loading={create.isPending}>
                    Criar conta
                </Button>
            </form>
        </>
    );
}
