import { type NextRequest } from "next/server";
import { getCloudflareContext, json, badRequest } from "@/lib/cf";
import { getActorByUsername, getActorByEmail, createActor, setEmailVerificationToken } from "@/lib/db";
import { generateKeyPair } from "@/lib/activitypub/security";
import { generateId } from "@/lib/activitypub/utils";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { detectLocale } from "@/lib/i18n/dict";

export async function POST(request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();
  const { username, email, password, turnstileToken } = await request.json() as { username?: string; email?: string; password?: string; turnstileToken?: string };
  const locale = detectLocale(request.headers.get("Accept-Language") ?? "");

  if (!username || !email || !password) return badRequest("Missing required fields");

  if (!turnstileToken) return badRequest("Missing captcha verification");

  const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
    }),
  });
  const turnstileData = await turnstileRes.json() as { success: boolean };
  if (!turnstileData.success) return badRequest("Captcha verification failed");

  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;
  const normalizedUsername = username.toLowerCase().trim();

  if (!/^[a-z0-9_]{2,30}$/.test(normalizedUsername))
    return badRequest("Username must be 2-30 characters, lowercase, alphanumeric or underscore");

  if (!email.includes("@")) return badRequest("Invalid email");

  if (password.length < 8) return badRequest("Password must be at least 8 characters");

  const existing = await getActorByUsername(env.DB, normalizedUsername, domain);
  if (existing) return badRequest("Username already taken");

  const existingEmail = await getActorByEmail(env.DB, email);
  if (existingEmail) return badRequest("Email already registered");

  const { publicKeyPem, privateKeyPem } = await generateKeyPair();
  const actorId = `https://${domain}/users/${normalizedUsername}`;
  const passwordHash = await hashPassword(password);

  await createActor(env.DB, {
    id: actorId,
    username: normalizedUsername,
    domain,
    publicKeyPem,
    privateKeyPem,
    email,
    passwordHash,
  });

  const verificationToken = crypto.randomUUID();
  await setEmailVerificationToken(env.DB, actorId, verificationToken);

  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

  await sendVerificationEmail(email, normalizedUsername, verificationUrl, locale);

  return json({
    verified: false,
    message: "Account created. Check your email for a verification link.",
    username: normalizedUsername,
    actorId,
  }, 201);
}
