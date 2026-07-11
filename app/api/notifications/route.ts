import { type NextRequest } from "next/server";
import { getCloudflareContext, json, unauthorized } from "@/lib/cf";
import { getNotifications } from "@/lib/db";
import { getSessionActor } from "@/lib/auth";

export async function GET(request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return unauthorized();
  const session = await getSessionActor(env.DB, token);
  if (!session) return unauthorized();

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "30"), 100);
  const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0");

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
