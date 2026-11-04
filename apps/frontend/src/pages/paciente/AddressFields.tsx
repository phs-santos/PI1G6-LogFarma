import { TextField } from "@fatec-pi/style-guide";
import type { Address } from "../../api/types";

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

export function AddressFields(props: {
    value: Address;
    errors: AddressErrors;
    onChange: (a: Address) => void;
}) {
    const { value, errors, onChange } = props;
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
            {field("street", "Rua", { autoComplete: "address-line1" })}
            {field("number", "Número")}
            {field("district", "Bairro")}
            {field("city", "Cidade", { autoComplete: "address-level2" })}
            {field("state", "Estado (UF)", { maxLength: 2 })}
            {field("zip", "CEP", { inputMode: "numeric", autoComplete: "postal-code" })}
        </>
    );
}
