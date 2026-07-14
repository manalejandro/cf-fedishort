import { type NextRequest } from "next/server";
import { getCloudflareContext, json, badRequest } from "@/lib/cf";
import { getActorByEmail, setPasswordResetToken } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { detectLocale } from "@/lib/i18n/dict";

export async function POST(request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();
  const { email } = await request.json() as { email?: string };
  const locale = detectLocale(request.headers.get("Accept-Language") ?? "");

  if (!email || !email.includes("@")) return badRequest("Invalid email");

  const actor = await getActorByEmail(env.DB, email);
  if (!actor || !actor.isLocal) {
    return json({ message: "If that email is registered, you will receive a password reset link." });
  }

  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;
  const resetToken = await setPasswordResetToken(env.DB, actor.id);
  const resetUrl = `${baseUrl}/?reset-token=${encodeURIComponent(resetToken)}`;

  await sendPasswordResetEmail(email, actor.username, resetUrl, locale);

  return json({ message: "If that email is registered, you will receive a password reset link." });
}
