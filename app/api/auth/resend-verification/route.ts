import { type NextRequest } from "next/server";
import { json, badRequest } from "@/lib/cf";
import { getActorByEmail, setEmailVerificationToken } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
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
    const rlEmail = await consumeRateLimit(env.DB, `resend:${normalizedEmail}`, 3, 3600);
    if (!rlEmail.ok) return tooManyRequests(rlEmail.retryAfter, "Too many requests, try later");
    const rlIp = await consumeRateLimit(env.DB, `resend:ip:${clientIp(request)}`, 10, 3600);
    if (!rlIp.ok) return tooManyRequests(rlIp.retryAfter, "Too many requests, try later");

    const actor = await getActorByEmail(env.DB, normalizedEmail);
    if (actor && actor.isLocal && !actor.emailVerified) {
      const domain = new URL(request.url).hostname;
      const baseUrl = `https://${domain}`;
      const verificationToken = crypto.randomUUID();
      await setEmailVerificationToken(env.DB, actor.id, verificationToken);
      const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

      try {
        await sendVerificationEmail(normalizedEmail, actor.username, verificationUrl, locale);
      } catch (err) {
        console.error("[resend-verification] Email send failed:", err);
      }
    }

    // Uniform response: never reveal whether the email is registered.
    return json({ message: "If that email is registered, a new verification link will be sent." });
  } catch (err) {
    console.error("[resend-verification] Error:", err);
    return json({ error: "Failed to process request" }, 500);
  }
}
