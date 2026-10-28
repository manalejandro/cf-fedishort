import { type NextRequest } from "next/server";
import { json, badRequest } from "@/lib/cf";
import { getActorByPasswordResetToken, updateActorPassword } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendPasswordResetConfirmation } from "@/lib/email";
import { detectLocale } from "@/lib/i18n/dict";
import { env } from "cloudflare:workers";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const locale = detectLocale(request.headers.get("Accept-Language") ?? "");

    let token: string | undefined;
    let password: string | undefined;
    try {
      ({ token, password } = (await request.json()) as { token?: string; password?: string });
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (!token) return badRequest("Missing reset token");
    if (!password || password.length < 8) return badRequest("Password must be at least 8 characters");
    if (password.length > 1024) return badRequest("Password too long");

    const actor = await getActorByPasswordResetToken(env.DB, token);
    if (!actor) return badRequest("Invalid or expired reset token");

    const passwordHash = await hashPassword(password);
    // updateActorPassword also revokes every existing session for the actor.
    await updateActorPassword(env.DB, actor.id, passwordHash);

    const domain = new URL(request.url).hostname;
    const baseUrl = `https://${domain}`;

    try {
      await sendPasswordResetConfirmation(actor.email ?? "", actor.username, baseUrl, locale);
    } catch (err) {
      console.error("[reset-password] Confirmation email failed:", err);
    }

    return json({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error("[reset-password] Error:", err);
    return json({ error: "Failed to process request" }, 500);
  }
}
