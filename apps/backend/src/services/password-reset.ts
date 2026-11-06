// Recuperar senha pelo app: link por e-mail, válido por 30 minutos e uma vez só.
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { passwordResetTokens, users } from "../db/schema.js";
import { BadRequestError } from "../domain/errors.js";
import { hashPassword } from "../auth/password.js";
import { env } from "../env.js";
import type { Email, Mailer } from "./mailer.js";

export const RESET_TOKEN_MINUTES = 30;
const INVALID_LINK = "Este link de recuperação não vale mais. Peça um novo.";

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function resetEmail(to: string, link: string): Email {
    const text = [
        "Olá!",
        "",
        "Recebemos um pedido para criar uma nova senha no LogFarma.",
        `Para criar a nova senha, abra este link (vale por ${RESET_TOKEN_MINUTES} minutos):`,
        link,
        "",
        "Se não foi você, ignore este e-mail. Sua senha continua a mesma.",
        "",
        "LogFarma — remédios do SUS",
    ].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;font-size:18px;line-height:1.5;color:#1a1a1a">
<p>Olá!</p>
<p>Recebemos um pedido para criar uma nova senha no <strong>LogFarma</strong>.</p>
<p><a href="${link}" style="display:inline-block;background:#0b5cad;color:#ffffff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
<p>O link vale por ${RESET_TOKEN_MINUTES} minutos.</p>
<p>Se não foi você, ignore este e-mail. Sua senha continua a mesma.</p>
<p style="color:#555">LogFarma — remédios do SUS</p>
</div>`;
    return { to, subject: "LogFarma: criar uma nova senha", text, html };
}

/**
 * Manda o link se o e-mail tiver conta ativa. Quem chama responde sempre igual,
 * exista a conta ou não, para não revelar quem tem cadastro (RNF03).
 */
export async function requestPasswordReset(db: Db, mailer: Mailer, email: string): Promise<void> {
    const [user] = await db
        .select({ id: users.id, email: users.email, active: users.active })
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()));
    if (!user || !user.active) return;

    const token = randomBytes(32).toString("base64url");
    await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000),
    });
    const link = `${env.appUrl.replace(/\/$/, "")}/nova-senha?codigo=${token}`;
    await mailer.send(resetEmail(user.email, link));
}

/** Troca a senha com o código do link e invalida todos os links pendentes da conta. */
export async function resetPassword(db: Db, token: string, password: string): Promise<void> {
    const newHash = await hashPassword(password);
    await db.transaction(async (tx) => {
        const [row] = await tx
            .select()
            .from(passwordResetTokens)
            .where(
                and(
                    eq(passwordResetTokens.tokenHash, hashToken(token)),
                    isNull(passwordResetTokens.usedAt),
                    gt(passwordResetTokens.expiresAt, new Date()),
                ),
            )
            .for("update");
        if (!row) throw new BadRequestError(INVALID_LINK);

        const [user] = await tx
            .select({ active: users.active })
            .from(users)
            .where(eq(users.id, row.userId));
        if (!user?.active) throw new BadRequestError(INVALID_LINK);

        await tx.update(users).set({ passwordHash: newHash }).where(eq(users.id, row.userId));
        await tx
            .update(passwordResetTokens)
            .set({ usedAt: new Date() })
            .where(
                and(eq(passwordResetTokens.userId, row.userId), isNull(passwordResetTokens.usedAt)),
            );
    });
}
