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
    databaseUrl: required("DATABASE_URL"),
    jwtSecret:
        process.env.NODE_ENV === "test"
            ? (process.env.JWT_SECRET ?? "test-secret")
            : required("JWT_SECRET"),
    cookieSecure: flag("COOKIE_SECURE"),
    allowDemoSeed: flag("ALLOW_DEMO_SEED"),
    demoPassword: process.env.DEMO_PASSWORD || "demo1234",
};

export type Env = typeof env;
