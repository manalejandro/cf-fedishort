import { type NextRequest } from "next/server";
import { json, badRequest, unauthorized } from "@/lib/cf";
import { verifyPassword, createSessionToken, needsRehash, hashPassword } from "@/lib/auth";
import { getActorByUsername, getActorByEmail, updatePasswordHashOnly } from "@/lib/db";
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
    let username: string | undefined;
    let password: string | undefined;
    let turnstileToken: string | undefined;
    try {
      ({ username, password, turnstileToken } = (await request.json()) as {
        username?: string;
        password?: string;
        turnstileToken?: string;
      });
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (!username || !password) return badRequest("Missing credentials");

    // Brute-force protection: per-IP and per-account limits.
    const ip = clientIp(request);
    const rlIp = await consumeRateLimit(env.DB, `login:ip:${ip}`, 30, 900);
    if (!rlIp.ok) return tooManyRequests(rlIp.retryAfter, "Too many login attempts, try later");
    const rlAccount = await consumeRateLimit(
      env.DB,
      `login:acct:${username.toLowerCase()}`,
      10,
      3600
    );
    if (!rlAccount.ok) {
      return tooManyRequests(rlAccount.retryAfter, "Too many login attempts for this account");
    }

    if (!env.TURNSTILE_SECRET_KEY) {
      console.error("[login] TURNSTILE_SECRET_KEY is not configured");
      return json({ error: "Login is temporarily unavailable" }, 503);
    }
    const validTurnstile = await verifyTurnstile(turnstileToken || "", env.TURNSTILE_SECRET_KEY);
    if (!validTurnstile) return badRequest("Captcha verification failed");

    const domain = new URL(request.url).hostname;
    const input = username.toLowerCase().trim();

    // Allow login by username or email.
    let actor = await getActorByUsername(env.DB, input, domain);
    if (!actor && input.includes("@")) {
      actor = await getActorByEmail(env.DB, input);
    }
    // Uniform response for unknown user / bad password / no password.
    if (!actor?.passwordHash || !actor.isLocal) return unauthorized();

    const valid = await verifyPassword(password, actor.passwordHash);
    if (!valid) return unauthorized();

    // Transparently upgrade legacy 100k-iteration hashes to the current work
    // factor. Hash-only update (no session purge): the user just authenticated.
    if (needsRehash(actor.passwordHash)) {
      try {
        await updatePasswordHashOnly(env.DB, actor.id, await hashPassword(password));
      } catch (err) {
        console.error("[login] Rehash failed:", err);
      }
    }

    if (!actor.emailVerified) {
      return json(
        {
          error: "Please verify your email before signing in. Check your inbox for the verification link.",
          code: "EMAIL_NOT_VERIFIED",
        },
        403
      );
    }

    const token = await createSessionToken(env.DB, actor.id, actor.id);

    return json({ token, username: actor.username, actorId: actor.id });
  } catch (err) {
    console.error("[login] Error:", err);
    return json({ error: "Login failed" }, 500);
  }
}
