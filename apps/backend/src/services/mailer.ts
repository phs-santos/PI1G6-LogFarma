// Envio de e-mail por SMTP, de qualquer provedor (Resend, Brevo, Gmail, servidor próprio).
// Quem configura é o .env (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM).
import nodemailer from "nodemailer";
import type { FastifyBaseLogger } from "fastify";
import { env } from "../env.js";

export interface Email {
    to: string;
    subject: string;
    text: string;
    html: string;
}

export interface Mailer {
    send(email: Email): Promise<void>;
}

/** SMTP quando há SMTP_HOST; senão, um carteiro de mentira que só escreve no log. */
export function createMailer(log: FastifyBaseLogger): Mailer {
    const { host, port, secure, user, pass } = env.smtp;
    if (host) {
        const transport = nodemailer.createTransport({
            host,
            port,
            secure,
            ...(user ? { auth: { user, pass } } : {}),
        });
        return {
            async send(email) {
                await transport.sendMail({ from: env.emailFrom, ...email });
            },
        };
    }
    return {
        async send(email) {
            if (env.nodeEnv === "production") {
                // Sem SMTP em produção: avisa, mas não escreve o texto (o link é segredo).
                log.warn("SMTP_HOST não configurado: e-mail não enviado");
                return;
            }
            // Desenvolvimento: o texto (com o link) vai para o log. Nunca o destinatário (LGPD).
            log.info({ subject: email.subject, text: email.text }, "e-mail (sem SMTP, só no log)");
        },
    };
}
