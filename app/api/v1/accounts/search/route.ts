import { type NextRequest } from "next/server";
import { json } from "@/lib/cf";
import { searchActors, getActorByUsernameAndDomain, getActorById } from "@/lib/db";
import { resolveWebFinger, fetchRemoteObject } from "@/lib/activitypub/federation";
import { cacheRemoteActor, isLocalActorId } from "@/lib/activitypub/signer-key";
import { consumeRateLimit, clientIp, tooManyRequests } from "@/lib/ratelimit";
import { env } from "cloudflare:workers";
import type { APActor } from "@/lib/types";

function publicActor(a: {
  id: string;
  username: string;
  domain: string;
  displayName: string | null;
  avatarUrl: string | null;
  summary: string | null;
  followersCount: number;
  followingCount: number;
  linksCount: number;
  isLocal: boolean;
}) {
  return {
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
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const rawLimit = parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 40) : 20;
  const resolve = request.nextUrl.searchParams.get("resolve") !== "false";

  if (!q) return json([]);

  // If the query looks like user@domain, try WebFinger resolution.
  if (q.includes("@") && q.split("@").length >= 2) {
    const normalized = q.startsWith("@") ? q.slice(1) : q;
    const [username, domain] = normalized.split("@");
    if (username && domain) {
      let actor = await getActorByUsernameAndDomain(env.DB, username, domain);
      if (!actor && resolve) {
        // Remote resolves trigger outbound fetches + DB writes from an
        // unauthenticated endpoint: cap them per IP.
        const rl = await consumeRateLimit(env.DB, `search:${clientIp(request)}`, 30, 3600);
        if (!rl.ok) return tooManyRequests(rl.retryAfter);

        const href = await resolveWebFinger(normalized);
        if (href) {
          const fetched = (await fetchRemoteObject(href)) as APActor | null;
          // Origin validation: the document must BE the resource we asked for
          // and must not claim to live on this instance (that would let a
          // malicious server overwrite local accounts).
          if (
            fetched?.publicKey?.publicKeyPem &&
            fetched.id === href &&
            !isLocalActorId(fetched.id)
          ) {
            await cacheRemoteActor(env.DB, fetched);
            actor = await getActorById(env.DB, href);
          }
        }
      }
      if (actor) return json([publicActor(actor)]);
    }
  }

  // Fallback: search local + cached remote actors.
  const results = await searchActors(env.DB, q, limit);
  return json(results.map(publicActor));
}
