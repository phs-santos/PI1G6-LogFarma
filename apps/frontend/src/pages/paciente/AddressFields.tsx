import { useEffect, useRef, useState } from "react";
import { TextField } from "@fatec-pi/style-guide";
import { lookupCep } from "../../api/cep";
import type { Address } from "../../api/types";
import { maskCep } from "../../lib/masks";

export type AddressErrors = Partial<Record<keyof Address, string>>;

export const EMPTY_ADDRESS: Address = {
    street: "",
    number: "",
    district: "",
    city: "Taquaritinga",
    state: "SP",
    zip: "",
};

export function validateAddress(a: Address): AddressErrors {
    const e: AddressErrors = {};
    if (!a.street.trim()) e.street = "Escreva o nome da rua.";
    if (!a.number.trim()) e.number = "Escreva o número da casa (ou s/n).";
    if (!a.district.trim()) e.district = "Escreva o bairro.";
    if (!a.city.trim()) e.city = "Escreva a cidade.";
    if (!/^[A-Za-z]{2}$/.test(a.state.trim())) e.state = "Use a sigla do estado, por exemplo SP.";
    if (a.zip.replace(/\D/g, "").length !== 8) e.zip = "O CEP tem 8 números.";
    return e;
}

export function cleanAddress(a: Address): Address {
    return {
        street: a.street.trim(),
        number: a.number.trim(),
        district: a.district.trim(),
        city: a.city.trim(),
        state: a.state.trim().toUpperCase(),
        zip: a.zip.replace(/\D/g, ""),
    };
}

/**
 * Endereço com o CEP primeiro: ao completar os 8 números, rua, bairro, cidade e UF são
 * preenchidos pelo ViaCEP. Sem internet ou CEP desconhecido, a pessoa preenche à mão.
 */
export function AddressFields(props: {
    value: Address;
    errors: AddressErrors;
    onChange: (a: Address) => void;
}) {
    const { value, errors, onChange } = props;
    const [status, setStatus] = useState("");
    const latest = useRef(value);
    latest.current = value;
    const cepDigits = value.zip.replace(/\D/g, "");

    useEffect(() => {
        if (cepDigits.length !== 8) return;
        let cancelled = false;
        setStatus("Procurando o endereço…");
        lookupCep(cepDigits)
            .then((found) => {
                if (cancelled) return;
                if (!found) {
                    setStatus("Não achamos esse CEP. Preencha o endereço abaixo.");
                    return;
                }
                onChange({
                    ...latest.current,
                    street: found.street || latest.current.street,
                    district: found.district || latest.current.district,
                    city: found.city || latest.current.city,
                    state: found.state || latest.current.state,
                });
                setStatus("Endereço encontrado. Confira e informe o número.");
            })
            .catch(() => {
                if (!cancelled)
                    setStatus("Não foi possível buscar o CEP agora. Preencha o endereço abaixo.");
            });
        return () => {
            cancelled = true;
        };
        // Só busca quando o CEP muda (onChange muda a cada desenho).
    }, [cepDigits]);

    const field = (key: keyof Address, label: string, extra: Record<string, unknown> = {}) => (
        <TextField
            label={label}
            value={value[key]}
            error={errors[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            {...extra}
        />
    );
    return (
        <>
            <TextField
                label="CEP"
                hint="Com o CEP, preenchemos o resto do endereço."
                inputMode="numeric"
                autoComplete="postal-code"
                value={maskCep(value.zip)}
                error={errors.zip}
                onChange={(e) => onChange({ ...value, zip: maskCep(e.target.value) })}
            />
            <p className="app-cep-status" role="status">
                {status}
            </p>
            {field("street", "Rua", { autoComplete: "address-line1" })}
            {field("number", "Número")}
            {field("district", "Bairro")}
            {field("city", "Cidade", { autoComplete: "address-level2" })}
            {field("state", "Estado (UF)", { maxLength: 2 })}
        </>
    );
}
