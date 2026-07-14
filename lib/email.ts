import { getCloudflareContext } from "./cf";
import type { SendEmail } from "./types/env";

type EmailType = "verification" | "password-reset" | "password-reset-confirm";

function buildHtml(type: EmailType, url: string, locale: string): string {
  const isEs = locale === "es";
  const texts = {
    verification: {
      title: isEs ? "Verifica tu correo electrónico" : "Verify your email",
      greeting: isEs
        ? "Gracias por registrarte en FediShort. Haz clic en el botón de abajo para verificar tu correo y activar tu cuenta."
        : "Thanks for signing up for FediShort! Click the button below to verify your email address and activate your account.",
      button: isEs ? "Verificar correo" : "Verify email",
      footer: isEs
        ? "Si no te registraste en FediShort, puedes ignorar este correo. Este enlace expira en 24 horas."
        : "If you didn't sign up for FediShort, you can ignore this email. This link expires in 24 hours.",
    },
    "password-reset": {
      title: isEs ? "Restablece tu contraseña" : "Reset your password",
      greeting: isEs
        ? "Recibimos una solicitud para restablecer la contraseña de tu cuenta de FediShort. Haz clic en el botón de abajo para continuar."
        : "We received a request to reset your FediShort account password. Click the button below to proceed.",
      button: isEs ? "Restablecer contraseña" : "Reset password",
      footer: isEs
        ? "Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Este enlace expira en 1 hora."
        : "If you didn't request a password reset, you can ignore this email. This link expires in 1 hour.",
    },
    "password-reset-confirm": {
      title: isEs ? "Contraseña restablecida" : "Password reset successful",
      greeting: isEs
        ? "Tu contraseña de FediShort ha sido restablecida exitosamente. Si no realizaste este cambio, contacta al administrador de inmediato."
        : "Your FediShort password has been successfully reset. If you didn't make this change, please contact the administrator immediately.",
      button: isEs ? "Iniciar sesión" : "Sign in",
      footer: isEs
        ? "Este es un correo automático, por favor no respondas."
        : "This is an automated email, please do not reply.",
    },
  };
  const t = texts[type];
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;padding:32px;background:#f5f5f5">
<div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:32px">
<div style="text-align:center;margin-bottom:24px">
<table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="width:48px;height:48px;border-radius:12px;background:#9333ea;color:white;font-weight:bold;font-size:24px;text-align:center;vertical-align:middle">F</td></tr></table>
</div>
<h2 style="text-align:center;color:#111">${escapeHtml(t.title)}</h2>
<p style="color:#666;line-height:1.6">${escapeHtml(t.greeting)}</p>
<div style="text-align:center;margin:32px 0">
<a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 32px;background:#9333ea;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">${escapeHtml(t.button)}</a>
</div>
<p style="color:#999;font-size:12px;text-align:center">${escapeHtml(t.footer)}</p>
</div>
</body>
</html>`;
}

async function trySend(
  emailBinding: SendEmail | undefined,
  fromEmail: string,
  fromName: string,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (emailBinding) {
    try {
      await emailBinding.send({
        to,
        from: { email: fromEmail, name: fromName },
        subject,
        html,
      });
      return true;
    } catch (err) {
      console.error("[email] Workers binding error:", err);
    }
  }
  console.log(`[email] To: ${to} | Subject: ${subject}`);
  return false;
}

export async function sendVerificationEmail(
  email: string,
  username: string,
  verificationUrl: string,
  locale: string
): Promise<void> {
  const { env } = getCloudflareContext();
  const html = buildHtml("verification", verificationUrl, locale);
  await trySend(
    env.EMAIL,
    env.EMAIL_FROM ?? "noreply@fedishort.com",
    env.EMAIL_FROM_NAME ?? "FediShort",
    email,
    "Verify your email / Verifica tu correo",
    html
  );
}

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  resetUrl: string,
  locale: string
): Promise<void> {
  const { env } = getCloudflareContext();
  const html = buildHtml("password-reset", resetUrl, locale);
  await trySend(
    env.EMAIL,
    env.EMAIL_FROM ?? "noreply@fedishort.com",
    env.EMAIL_FROM_NAME ?? "FediShort",
    email,
    "Reset your password / Restablece tu contraseña",
    html
  );
}

export async function sendPasswordResetConfirmation(
  email: string,
  username: string,
  loginUrl: string,
  locale: string
): Promise<void> {
  const { env } = getCloudflareContext();
  const html = buildHtml("password-reset-confirm", loginUrl, locale);
  await trySend(
    env.EMAIL,
    env.EMAIL_FROM ?? "noreply@fedishort.com",
    env.EMAIL_FROM_NAME ?? "FediShort",
    email,
    "Password reset successful / Contraseña restablecida",
    html
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
