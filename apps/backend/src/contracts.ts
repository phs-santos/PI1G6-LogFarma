// Contratos da API (request/response). O frontend espelha estes tipos.

export type UserRole = "patient" | "pharmacy_staff" | "supplier_staff" | "courier" | "manager";
export type PriorityCategory = "chronic" | "oncology" | "rare_disease";
export type StaffOccupation = "pharmacist" | "pharmacy_assistant";

export interface SessionUser {
    id: string;
    role: UserRole;
}

export interface AddressInput {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    zip: string;
}

/** Aba da tela Entrar: "Sou paciente" (`patient`) ou "Sou da equipe" (`team`). */
export type LoginAudience = "patient" | "team";

export interface LoginInput {
    email: string;
    password: string;
    /** Quando vem, a conta precisa ser dessa aba; senão a API responde 403. */
    audience?: LoginAudience;
}

export interface RegisterPatientInput {
    email: string;
    password: string;
    fullName: string;
    socialName?: string;
    birthDate: string;
    cns: string;
    cpf?: string;
    phone: string;
    address: AddressInput;
    latitude?: number;
    longitude?: number;
    referencePharmacyId: string;
    mobilityLimited: boolean;
    priority?: { category: PriorityCategory; consent: true };
}

export interface CreateAccountInput {
    role: Exclude<UserRole, "patient">;
    email: string;
    password: string;
    fullName: string;
    pharmacyId?: string;
    occupation?: StaffOccupation;
    crfNumber?: string;
    crfState?: string;
    supplierId?: string;
    phone?: string;
    deliveryProgram?: string;
}
