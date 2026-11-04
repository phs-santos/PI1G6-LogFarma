export const env = {
    port: Number(process.env.PORT ?? 3333),
    host: process.env.HOST ?? "0.0.0.0",
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    // Ainda não usado: o banco entra quando o grupo escolher o ORM/driver.
    databaseUrl: process.env.DATABASE_URL,
};
