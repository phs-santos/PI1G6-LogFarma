// Busca de endereço pelo CEP no ViaCEP (https://viacep.com.br), gratuito e sem chave, que usa a
// base de CEPs dos Correios. A API oficial dos Correios exige contrato e token.

export interface CepAddress {
    street: string;
    district: string;
    city: string;
    state: string;
}

/** Endereço do CEP (8 dígitos); `null` se o CEP não existe. Lança erro se não houver conexão. */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return null;
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<{
        erro: unknown;
        logradouro: string;
        bairro: string;
        localidade: string;
        uf: string;
    }>;
    if (body.erro) return null;
    return {
        street: body.logradouro ?? "",
        district: body.bairro ?? "",
        city: body.localidade ?? "",
        state: body.uf ?? "",
    };
}
