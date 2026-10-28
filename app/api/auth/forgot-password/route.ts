import { type NextRequest } from "next/server";
import { json, badRequest } from "@/lib/cf";
import { getActorByEmail, setPasswordResetToken } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { detectLocale } from "@/lib/i18n/dict";
import { consumeRateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { env } from "cloudflare:workers";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const locale = detectLocale(request.headers.get("Accept-Language") ?? "");

    let email: string | undefined;
    try {
      ({ email } = (await request.json()) as { email?: string });
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (!email || !email.includes("@")) return badRequest("Invalid email");
    const normalizedEmail = email.toLowerCase().trim();

    // Anti email-bombing: few requests per address and per IP.
    const rlEmail = await consumeRateLimit(env.DB, `forgot:${normalizedEmail}`, 3, 3600);
    if (!rlEmail.ok) return tooManyRequests(rlEmail.retryAfter, "Too many requests, try later");
    const rlIp = await consumeRateLimit(env.DB, `forgot:ip:${clientIp(request)}`, 10, 3600);
    if (!rlIp.ok) return tooManyRequests(rlIp.retryAfter, "Too many requests, try later");

    const actor = await getActorByEmail(env.DB, normalizedEmail);
    if (actor && actor.isLocal) {
      const domain = new URL(request.url).hostname;
      const baseUrl = `https://${domain}`;
      const resetToken = await setPasswordResetToken(env.DB, actor.id);
      const resetUrl = `${baseUrl}/?reset-token=${encodeURIComponent(resetToken)}`;

      try {
        await sendPasswordResetEmail(normalizedEmail, actor.username, resetUrl, locale);
      } catch (err) {
        console.error("[forgot-password] Email send failed:", err);
      }
    }

    // Uniform response: never reveal whether the email is registered.
    return json({ message: "If that email is registered, you will receive a password reset link." });
  } catch (err) {
    console.error("[forgot-password] Error:", err);
    return json({ error: "Failed to process request" }, 500);
  }
}
