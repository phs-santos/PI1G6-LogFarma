// Primeiro gestor da rede, criado ao iniciar o backend a partir de ADMIN_EMAIL e ADMIN_PASSWORD.
// Só cria quando ainda não existe nenhum gestor; depois a conta é igual às outras (senha só no
// banco, com hash, e troca pelo app). As variáveis podem ser apagadas do .env depois disso.
import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { users } from "../db/schema.js";
import { createAccount } from "./accounts.js";

export interface AdminBootstrapConfig {
    nodeEnv: string;
    email?: string;
    password?: string;
    name: string;
}

export type AdminBootstrapResult =
    | { status: "created" }
    | { status: "exists" }
    | { status: "skipped" }
    | { status: "refused"; reason: string };

export const ADMIN_MIN_PASSWORD_PRODUCTION = 12;
const WEAK_PASSWORDS = new Set([
    "admin1234",
    "demo1234",
    "senha1234",
    "12345678",
    "troque-esta-senha",
]);

/** Em produção a conta que cria todas as outras precisa de senha forte. */
export function adminPasswordProblem(nodeEnv: string, password: string): string | null {
    if (nodeEnv !== "production") return null;
    if (password.length < ADMIN_MIN_PASSWORD_PRODUCTION) {
        return `ADMIN_PASSWORD precisa ter pelo menos ${ADMIN_MIN_PASSWORD_PRODUCTION} caracteres em produção.`;
    }
    if (WEAK_PASSWORDS.has(password.toLowerCase())) {
        return "ADMIN_PASSWORD é uma senha conhecida; escolha outra.";
    }
    return null;
}

/** Cria o primeiro gestor se ainda não houver nenhum. Nunca altera uma conta que já existe. */
export async function ensureFirstManager(
    db: Db,
    config: AdminBootstrapConfig,
): Promise<AdminBootstrapResult> {
    const [manager] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "manager"))
        .limit(1);
    if (manager) return { status: "exists" };
    if (!config.email || !config.password) return { status: "skipped" };

    const problem = adminPasswordProblem(config.nodeEnv, config.password);
    if (problem) return { status: "refused", reason: problem };

    await createAccount(db, {
        role: "manager",
        email: config.email,
        password: config.password,
        fullName: config.name,
    });
    return { status: "created" };
}
