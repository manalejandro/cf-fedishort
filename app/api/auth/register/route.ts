import { type NextRequest } from "next/server";
import { json, badRequest } from "@/lib/cf";
import { getActorByUsername, getActorByEmail, createActor, setEmailVerificationToken } from "@/lib/db";
import { generateKeyPair } from "@/lib/activitypub/security";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { detectLocale } from "@/lib/i18n/dict";
import { consumeRateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { env } from "cloudflare:workers";

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const locale = detectLocale(request.headers.get("Accept-Language") ?? "");

    let username: string | undefined;
    let email: string | undefined;
    let password: string | undefined;
    let confirmPassword: string | undefined;
    let turnstileToken: string | undefined;
    try {
      ({ username, email, password, confirmPassword, turnstileToken } = (await request.json()) as {
        username?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
        turnstileToken?: string;
      });
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (!username || !email || !password) return badRequest("Missing required fields");
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return badRequest("Passwords do not match");
    }

    // Anti spam: few registrations per IP.
    const rl = await consumeRateLimit(env.DB, `register:${clientIp(request)}`, 10, 3600);
    if (!rl.ok) return tooManyRequests(rl.retryAfter, "Too many registration attempts");

    if (!env.TURNSTILE_SECRET_KEY) {
      console.error("[register] TURNSTILE_SECRET_KEY is not configured");
      return json({ error: "Registration is temporarily unavailable" }, 503);
    }
    const validTurnstile = await verifyTurnstile(turnstileToken || "", env.TURNSTILE_SECRET_KEY);
    if (!validTurnstile) return badRequest("Captcha verification failed");

    const domain = new URL(request.url).hostname;
    const baseUrl = `https://${domain}`;
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    if (!/^[a-z0-9_]{2,30}$/.test(normalizedUsername))
      return badRequest("Username must be 2-30 characters, lowercase, alphanumeric or underscore");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
      return badRequest("Invalid email");
    }

    if (password.length < 8) return badRequest("Password must be at least 8 characters");
    if (password.length > 1024) return badRequest("Password too long");

    const existing = await getActorByUsername(env.DB, normalizedUsername, domain);
    const existingEmail = await getActorByEmail(env.DB, normalizedEmail);
    if (existing || existingEmail) {
      // Uniform message: do not reveal whether the username or the email exists.
      return json({ error: "Username or email already in use" }, 409);
    }

    const { publicKeyPem, privateKeyPem } = await generateKeyPair();
    const actorId = `https://${domain}/users/${normalizedUsername}`;
    const passwordHash = await hashPassword(password);

    try {
      await createActor(env.DB, {
        id: actorId,
        username: normalizedUsername,
        domain,
        publicKeyPem,
        privateKeyPem,
        email: normalizedEmail,
        passwordHash,
      });
    } catch {
      // Race on the UNIQUE indexes (username/domain or email).
      return json({ error: "Username or email already in use" }, 409);
    }

    const verificationToken = crypto.randomUUID();
    await setEmailVerificationToken(env.DB, actorId, verificationToken);

    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

    try {
      await sendVerificationEmail(normalizedEmail, normalizedUsername, verificationUrl, locale);
    } catch (err) {
      // The account exists but is unverified; the user can request a new link.
      console.error("[register] Verification email failed:", err);
    }

    return json({
      verified: false,
      message: "Account created. Check your email for a verification link.",
      username: normalizedUsername,
      actorId,
    }, 201);
  } catch (err) {
    console.error("[register] Error:", err);
    return json({ error: "Registration failed" }, 500);
  }
}
