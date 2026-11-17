/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Endereço da API em outro domínio (ex.: https://api.logfarma.codexolimpo.com.br). Vazio = mesmo domínio. */
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
