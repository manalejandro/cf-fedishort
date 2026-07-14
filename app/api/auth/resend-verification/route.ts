import { type NextRequest } from "next/server";
import { getCloudflareContext, json, badRequest } from "@/lib/cf";
import { getActorByEmail, setEmailVerificationToken } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { detectLocale } from "@/lib/i18n/dict";

export async function POST(request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();
  const { email } = await request.json() as { email?: string };
  const locale = detectLocale(request.headers.get("Accept-Language") ?? "");

  if (!email || !email.includes("@")) return badRequest("Invalid email");

  const actor = await getActorByEmail(env.DB, email);
  if (!actor || !actor.isLocal) {
    return json({ message: "If that email is registered, a new verification link will be sent." });
  }

  if (actor.emailVerified) {
    return json({ message: "This email is already verified." });
  }

  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;
  const verificationToken = crypto.randomUUID();
  await setEmailVerificationToken(env.DB, actor.id, verificationToken);
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

  await sendVerificationEmail(actor.email ?? "", actor.username, verificationUrl, locale);

  return json({ message: "If that email is registered, a new verification link will be sent." });
}
