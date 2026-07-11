import { type NextRequest } from "next/server";
import { getCloudflareContext, json, badRequest } from "@/lib/cf";
import { getActorByUsername } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();
  const { username, password } = await request.json() as { username?: string; password?: string };

  if (!username || !password) return badRequest("Missing credentials");

  const domain = new URL(request.url).hostname;
  const actor = await getActorByUsername(env.DB, username.toLowerCase().trim(), domain);

  if (!actor || !actor.passwordHash || !actor.isLocal)
    return json({ error: "Invalid credentials" }, 401);

  const valid = await verifyPassword(password, actor.passwordHash);
  if (!valid) return json({ error: "Invalid credentials" }, 401);

  if (!actor.emailVerified) {
    return json({ error: "Please verify your email before signing in. Check your inbox for the verification link." }, 403);
  }

  const sessionToken = crypto.randomUUID();
  await env.DB
    .prepare("INSERT OR REPLACE INTO sessions (id, actor_id, user_id, token, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .bind(crypto.randomUUID(), actor.id, actor.username, sessionToken)
    .run();

  return json({ token: sessionToken, username: actor.username, actorId: actor.id });
}
