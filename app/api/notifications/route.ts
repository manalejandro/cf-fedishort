import { type NextRequest } from "next/server";
import { json, unauthorized } from "@/lib/cf";
import { getNotifications } from "@/lib/db";
import { getSessionActor } from "@/lib/auth";
import { env } from "cloudflare:workers";

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return unauthorized();
  const session = await getSessionActor(env.DB, token);
  if (!session) return unauthorized();

  const rawLimit = parseInt(request.nextUrl.searchParams.get("limit") ?? "30", 10);
  const rawOffset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 30;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.trunc(rawOffset) : 0;

  // Fetch notifications and enrich with actor info
  const notifs = await getNotifications(env.DB, session.id, limit, offset);

  // Enrich with actor details
  const enriched = await Promise.all(
    notifs.map(async (n) => {
      const actor = n.accountId ? await env.DB.prepare("SELECT username, domain, display_name, avatar_url FROM actors WHERE id = ?").bind(n.accountId).first() as { username: string; domain: string; display_name: string | null; avatar_url: string | null } | null : null;
      return {
        ...n,
        actor: actor ? {
          id: n.accountId,
          username: actor.username,
          domain: actor.domain,
          displayName: actor.display_name,
          avatarUrl: actor.avatar_url,
        } : null,
      };
    })
  );

  return json(enriched);
}
