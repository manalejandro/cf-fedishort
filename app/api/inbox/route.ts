import { type NextRequest } from "next/server";
import { getCloudflareContext, json } from "@/lib/cf";
import { processInboxActivity } from "@/lib/activitypub/inbox";
import { verifySignature, extractSigningKeyId } from "@/lib/activitypub/security";
import { fetchRemoteObject } from "@/lib/activitypub/federation";
import { getActorById, getActorByUsername } from "@/lib/db";
import type { APActor } from "@/lib/types";

export async function POST(request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();
  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;

  const rawBody = await request.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return json({ error: "Invalid JSON" }, 400); }

  const actorId = typeof body.actor === "string" ? body.actor : (body.actor as { id?: string })?.id;
  if (!actorId) return json({ error: "Missing actor" }, 400);

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  const sigKeyId = extractSigningKeyId(headers);
  const signingActorId = sigKeyId ? sigKeyId.replace(/#.*$/, "") : actorId;

  let signingKey: { id: string; privateKeyPem: string } | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const localRow = await (env.DB as any).prepare("SELECT id, private_key_pem FROM actors WHERE is_local = 1 AND private_key_pem IS NOT NULL LIMIT 1").first();
    if (localRow?.private_key_pem) signingKey = { id: localRow.id, privateKeyPem: localRow.private_key_pem };
  } catch { /* ignore */ }

  let senderActor: APActor | null = null;
  try {
    const cached = await getActorById(env.DB, signingActorId);
    if (cached?.publicKeyPem) {
      senderActor = {
        id: cached.id, type: "Person", preferredUsername: cached.username,
        inbox: cached.inbox ?? `${signingActorId}/inbox`, outbox: `${signingActorId}/outbox`,
        followers: `${signingActorId}/followers`, following: `${signingActorId}/following`,
        publicKey: { id: sigKeyId ?? `${signingActorId}#main-key`, owner: signingActorId, publicKeyPem: cached.publicKeyPem },
      } as APActor;
    } else {
      const fetched = await fetchRemoteObject(signingActorId, signingKey ? `${signingKey.id}#main-key` : undefined, signingKey?.privateKeyPem) as APActor | null;
      if (fetched?.publicKey?.publicKeyPem) {
        senderActor = fetched;
        try {
          const upDomain = new URL(fetched.id).hostname;
          await env.DB
            .prepare("INSERT OR REPLACE INTO actors (id, username, domain, display_name, summary, avatar_url, header_url, public_key_pem, inbox, is_local, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))")
            .bind(fetched.id, fetched.preferredUsername, upDomain, fetched.name ?? null, fetched.summary ?? null, fetched.icon?.url ?? null, fetched.image?.url ?? null, fetched.publicKey.publicKeyPem, fetched.inbox ?? null)
            .run();
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }

  if (!senderActor?.publicKey?.publicKeyPem) return json({ error: "Cannot verify signature" }, 401);

  const dateHeader = headers["date"];
  if (dateHeader) {
    const requestDate = new Date(dateHeader);
    if (isNaN(requestDate.getTime()) || Math.abs(Date.now() - requestDate.getTime()) > 12 * 36e5)
      return json({ error: "Request date too old" }, 401);
  }

  const valid = await verifySignature("POST", `${baseUrl}/inbox`, headers, senderActor.publicKey.publicKeyPem, rawBody);
  if (!valid) return json({ error: "Invalid signature" }, 401);

  let recipient: { id: string; username: string; privateKeyPem: string } | null = null;

  const inboxUsername = request.nextUrl.pathname.match(/^\/api\/users\/([^/]+)\/inbox$/)?.[1];
  if (inboxUsername) {
    const r = await getActorByUsername(env.DB, inboxUsername, domain);
    if (r?.privateKeyPem) recipient = { id: r.id, username: r.username, privateKeyPem: r.privateKeyPem };
  } else {
    const targetId = typeof body.object === "string" ? body.object : (body.object as { id?: string })?.id;
    if (targetId) {
      const r = await getActorById(env.DB, targetId);
      if (r?.privateKeyPem) recipient = { id: r.id, username: r.username, privateKeyPem: r.privateKeyPem };
    }
  }

  await processInboxActivity(body as never, {
    db: env.DB,
    baseUrl,
    ...(recipient ? { recipient } : {}),
    signingKey,
  });

  return json({ status: "accepted" }, 202);
}
