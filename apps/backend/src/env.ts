// Leitura das variáveis de ambiente. Toda variável nova entra aqui e no .env.example da raiz do monorepo.

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Variável de ambiente ${name} não definida (veja o .env.example da raiz do monorepo).`,
        );
    }
    return value;
}

function flag(name: string): boolean {
    return process.env[name] === "true";
}

export const env = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3333),
    host: process.env.HOST ?? "0.0.0.0",
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    // Endereço das telas, usado nos links dos e-mails. Sem ele, usa o CORS_ORIGIN.
    appUrl: process.env.APP_URL || process.env.CORS_ORIGIN || "http://localhost:5173",
    databaseUrl: required("DATABASE_URL"),
    jwtSecret:
        process.env.NODE_ENV === "test"
            ? (process.env.JWT_SECRET ?? "test-secret")
            : required("JWT_SECRET"),
    cookieSecure: flag("COOKIE_SECURE"),
    allowDemoSeed: flag("ALLOW_DEMO_SEED"),
    demoPassword: process.env.DEMO_PASSWORD || "demo1234",
    // Primeiro gestor, criado ao iniciar só se ainda não existir nenhum (services/bootstrap-admin.ts).
    admin: {
        email: process.env.ADMIN_EMAIL || undefined,
        password: process.env.ADMIN_PASSWORD || undefined,
        name: process.env.ADMIN_NAME || "Administrador",
    },
    // E-mail (recuperar senha) por SMTP — qualquer provedor (Resend, Brevo, Gmail, servidor próprio).
    // Sem SMTP_HOST o backend não envia: em desenvolvimento, escreve o link no log.
    // Usuário e senha são segredo: ficam só no .env e na VPS, nunca no código.
    smtp: {
        host: process.env.SMTP_HOST || undefined,
        port: Number(process.env.SMTP_PORT || 465),
        // 465 = conexão já cifrada; 587 = STARTTLS (SMTP_SECURE=false).
        secure: process.env.SMTP_SECURE === undefined ? true : flag("SMTP_SECURE"),
        user: process.env.SMTP_USER || undefined,
        pass: process.env.SMTP_PASS || undefined,
    },
    emailFrom: process.env.EMAIL_FROM || "LogFarma <nao-responda@logfarma.codexolimpo.com.br>",
};

export type Env = typeof env;
