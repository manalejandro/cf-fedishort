import { type NextRequest } from "next/server";
import { getCloudflareContext, json, badRequest } from "@/lib/cf";
import { getActorByPasswordResetToken, updateActorPassword, clearPasswordResetToken } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetConfirmation } from "@/lib/email";
import { detectLocale } from "@/lib/i18n/dict";

export async function POST(request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();
  const { token, password } = await request.json() as { token?: string; password?: string };
  const locale = detectLocale(request.headers.get("Accept-Language") ?? "");

  if (!token) return badRequest("Missing reset token");
  if (!password || password.length < 8) return badRequest("Password must be at least 8 characters");

  const actor = await getActorByPasswordResetToken(env.DB, token);
  if (!actor) return badRequest("Invalid or expired reset token");

  const passwordHash = await hashPassword(password);
  await updateActorPassword(env.DB, actor.id, passwordHash);

  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;

  await sendPasswordResetConfirmation(actor.email ?? "", actor.username, baseUrl, locale);

  return json({ message: "Password has been reset successfully." });
}
