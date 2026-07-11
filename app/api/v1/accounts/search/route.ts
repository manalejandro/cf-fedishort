import { type NextRequest } from "next/server";
import { getCloudflareContext, json } from "@/lib/cf";
import { searchActors, getActorByUsernameAndDomain } from "@/lib/db";
import { resolveWebFinger, fetchRemoteObject } from "@/lib/activitypub/federation";

export async function GET(request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return json([]);

  const mapActor = (a: { id: string; username: string; domain: string; displayName: string | null; avatarUrl: string | null; summary: string | null; followersCount: number; followingCount: number; linksCount: number; isLocal: boolean }) => ({
    id: a.id,
    username: a.username,
    domain: a.domain,
    displayName: a.displayName,
    avatarUrl: a.avatarUrl,
    summary: a.summary,
    followersCount: a.followersCount,
    followingCount: a.followingCount,
    linksCount: a.linksCount,
    isLocal: a.isLocal,
  });

  // If query looks like user@domain, try WebFinger resolution
  const fediMatch = q.match(/^@?([a-z0-9_\.-]+)@([a-z0-9_\.-]+\.[a-z]+)$/i);
  if (fediMatch) {
    const [, username, domain] = fediMatch;

    // Check if already cached
    let actor = await getActorByUsernameAndDomain(env.DB, username, domain);
    if (!actor) {
      // Resolve via WebFinger
      const actorUrl = await resolveWebFinger(`${username}@${domain}`);
      if (actorUrl) {
        // Check if already cached by ID
        const byId = await env.DB.prepare("SELECT id FROM actors WHERE id = ?").bind(actorUrl).first() as { id: string } | null;
        if (!byId) {
          // Fetch and cache the remote actor
          const fetched = await fetchRemoteObject(actorUrl) as { id: string; preferredUsername: string; inbox?: string; name?: string; summary?: string; icon?: { url?: string }; image?: { url?: string }; publicKey?: { publicKeyPem: string } } | null;
          if (fetched?.publicKey?.publicKeyPem) {
            const fetchedDomain = new URL(fetched.id).hostname;
            await env.DB
              .prepare("INSERT OR REPLACE INTO actors (id, username, domain, display_name, summary, avatar_url, header_url, public_key_pem, inbox, is_local, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))")
              .bind(fetched.id, fetched.preferredUsername, fetchedDomain, fetched.name ?? null, fetched.summary ?? null, fetched.icon?.url ?? null, fetched.image?.url ?? null, fetched.publicKey.publicKeyPem, fetched.inbox ?? null)
              .run();
          }
        }
        actor = await getActorByUsernameAndDomain(env.DB, username, domain);
      }
    }

    if (actor) {
      return json([mapActor(actor)]);
    }
  }

  // Fallback: search local + cached remote actors
  const results = await searchActors(env.DB, q);
  return json(results.map(mapActor));
}
