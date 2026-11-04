// Leitura das variáveis de ambiente. Toda variável nova entra aqui e em .env.example.

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Variável de ambiente ${name} não definida (veja .env.example).`);
    }
    return value;
}

function flag(name: string): boolean {
    return process.env[name] === "true";
}

function days(name: string, fallback: number): number {
    const raw = process.env[name];
    const value = raw === undefined ? fallback : Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Variável ${name} precisa ser um número inteiro de dias.`);
    }
    return value;
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
    prescriptionDays: {
        simpleContinuous: days("PRESCRIPTION_DAYS_SIMPLE_CONTINUOUS", 180),
        simple: days("PRESCRIPTION_DAYS_SIMPLE", 30),
        antimicrobial: days("PRESCRIPTION_DAYS_ANTIMICROBIAL", 10),
        specialControl: days("PRESCRIPTION_DAYS_SPECIAL_CONTROL", 30),
    },
};

export type Env = typeof env;
