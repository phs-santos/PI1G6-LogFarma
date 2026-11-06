import { useState, type FormEvent } from "react";
import { Button, Notice, SelectField, TextField } from "@fatec-pi/style-guide";
import { createPharmacy } from "../../api/manager";
import type { PharmacyInput, PharmacyKind } from "../../api/types";
import { qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { onlyDigits } from "../../lib/format";
import { maskPhone } from "../../lib/masks";
import { KIND_TEXT, NETWORK_TEXT } from "./pharmacyText";

const EMPTY = {
    name: "",
    kind: "ubs" as PharmacyKind,
    network: "municipal" as PharmacyInput["network"],
    address: "",
    phone: "",
    openingHours: "seg–sex 7h–17h",
    cnes: "",
};

/** Formulário de unidade nova (diálogo "Cadastrar unidade" da lista de unidades). */
export function UnidadeForm({ onCreated }: { onCreated: (name: string) => void }) {
    const [f, setF] = useState(EMPTY);
    const [error, setError] = useState("");
    const create = useActionMutation(createPharmacy, {
        invalidate: [qk.pharmacies],
        onSuccess: () => onCreated(f.name.trim()),
    });
    const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) =>
        setF((old) => ({ ...old, [key]: value }));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const phone = onlyDigits(f.phone);
        const cnes = onlyDigits(f.cnes);
        if (f.name.trim().length < 3 || f.address.trim().length < 5) {
            return setError("Preencha o nome e o endereço completo.");
        }
        if (phone.length < 10 || phone.length > 11) return setError("Telefone com DDD.");
        if (f.openingHours.trim().length < 3) return setError("Informe o horário.");
        if (cnes && cnes.length !== 7) return setError("O CNES tem 7 números.");
        setError("");
        const input: PharmacyInput = {
            name: f.name.trim(),
            kind: f.kind,
            network: f.network,
            address: f.address.trim(),
            phone,
            openingHours: f.openingHours.trim(),
        };
        if (cnes) input.cnes = cnes;
        create.run(input);
    };

    return (
        <form className="app-form-grid" onSubmit={submit} noValidate>
            <div className="app-form-grid__wide">
                <TextField
                    label="Nome da unidade"
                    hint="Por exemplo: UBS Vila Xavier"
                    value={f.name}
                    onChange={(e) => set("name", e.target.value)}
                />
            </div>
            <SelectField
                label="Tipo"
                value={f.kind}
                onChange={(e) => set("kind", e.target.value as PharmacyKind)}
                options={(Object.keys(KIND_TEXT) as PharmacyKind[]).map((k) => ({
                    value: k,
                    label: KIND_TEXT[k],
                }))}
            />
            <SelectField
                label="Rede"
                value={f.network}
                onChange={(e) => set("network", e.target.value as PharmacyInput["network"])}
                options={(Object.keys(NETWORK_TEXT) as PharmacyInput["network"][]).map((n) => ({
                    value: n,
                    label: NETWORK_TEXT[n],
                }))}
            />
            <div className="app-form-grid__wide">
                <TextField
                    label="Endereço"
                    hint="Rua, número, bairro e cidade/UF"
                    value={f.address}
                    onChange={(e) => set("address", e.target.value)}
                />
            </div>
            <TextField
                label="Telefone com DDD"
                type="tel"
                value={f.phone}
                onChange={(e) => set("phone", maskPhone(e.target.value))}
            />
            <TextField
                label="Horário de atendimento"
                value={f.openingHours}
                onChange={(e) => set("openingHours", e.target.value)}
            />
            <TextField
                label="CNES (opcional)"
                inputMode="numeric"
                value={f.cnes}
                onChange={(e) => set("cnes", e.target.value)}
            />
            <div className="app-form-grid__wide">
                {(error || create.isError) && (
                    <Notice tone="danger" title="Não foi possível salvar.">
                        <p>{error || create.error?.message}</p>
                    </Notice>
                )}
                <div className="app-form-grid__actions">
                    <Button type="submit" loading={create.isPending}>
                        Cadastrar unidade
                    </Button>
                </div>
            </div>
        </form>
    );
}
