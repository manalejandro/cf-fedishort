import { type NextRequest } from "next/server";
import { json } from "@/lib/cf";
import { processInboxActivity } from "@/lib/activitypub/inbox";
import { extractSigningKeyId } from "@/lib/activitypub/security";
import { purgeGoneSignerData, verifyIncomingSignature } from "@/lib/activitypub/signer-key";
import { getActorById } from "@/lib/db";
import { env } from "cloudflare:workers";

// 1 MB is far above any legitimate AP activity we accept.
const MAX_BODY_BYTES = 1_000_000;

// POST /inbox — Shared inbox for federation delivery
export async function POST(request: NextRequest): Promise<Response> {
  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;

  // Cheap early-out on the declared size before buffering anything.
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  // Read body as text so we can parse JSON ourselves (needed for digest
  // verification without a second read).
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json({ error: "Could not read request body" }, 400);
  }
  // Measure BYTES, not characters: multi-byte UTF-8 payloads are longer than
  // rawBody.length suggests.
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const actorId = typeof body.actor === "string" ? body.actor : (body.actor as { id?: string })?.id;
  if (!actorId) return json({ error: "Missing actor" }, 400);

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  // The HTTP Signature's keyId identifies the actor that actually signed the
  // request. Always verify against the signing actor.
  const sigKeyId = extractSigningKeyId(headers);
  const signingActorId = sigKeyId ? sigKeyId.replace(/#.*$/, "") : actorId;

  // Local signing key used by the activity handlers for outbound fetches.
  let signingKey: { id: string; privateKeyPem: string } | undefined;
  try {
    const localRow = await env.DB
      .prepare("SELECT id, private_key_pem FROM actors WHERE is_local = 1 AND private_key_pem IS NOT NULL ORDER BY created_at ASC LIMIT 1")
      .first<{ id: string; private_key_pem: string }>();
    if (localRow?.private_key_pem) {
      signingKey = { id: localRow.id, privateKeyPem: localRow.private_key_pem };
    }
  } catch (err) {
    console.error("[inbox] Local signing key lookup failed:", err);
  }

  const check = await verifyIncomingSignature(env.DB, {
    method: "POST",
    url: `${baseUrl}/inbox`,
    headers,
    body: rawBody,
    signingKeyId: sigKeyId ?? `${actorId}#main-key`,
    signingKey,
  });
  if (!check.ok) {
    const activityType = typeof body.type === "string" ? body.type.toLowerCase() : "";
    const activityObject = body.object;
    const activityObjectId = typeof activityObject === "string" ? activityObject : (activityObject as { id?: string } | undefined)?.id ?? "";

    // An unverifiable `Delete` from an account the origin reports as gone can
    // only remove data (or nothing at all), so treat it as a delivered no-op.
    if (check.reason === "gone" && activityType === "delete") {
      const purged = await purgeGoneSignerData(env.DB, check, signingActorId);
      if (purged) console.warn(`[inbox] purged cached copy of gone actor ${signingActorId}`);
      return json({ status: "accepted" }, 202);
    }

    // A `Delete` whose signer key cannot be fetched right now can still be a
    // no-op when neither the signer nor the target object is cached. Anything
    // cached stays retryable: an unverifiable Delete must never remove data.
    if (check.reason === "no-key" && activityType === "delete" && activityObjectId) {
      const [signer, target] = await Promise.all([
        getActorById(env.DB, signingActorId).catch(() => null),
        env.DB.prepare("SELECT id FROM objects WHERE id = ?").bind(activityObjectId).first().catch(() => null),
      ]);
      if (!signer && !target) return json({ status: "accepted" }, 202);
    }

    const detail = check.status ? ` (HTTP ${check.status})` : "";
    console.warn(
      `[inbox] ${check.reason} for ${signingActorId}${detail} type=${activityType || "?"}` +
      `${activityObjectId ? ` object=${activityObjectId}` : ""}`
    );
    // `no-key` is retryable (503) so the sender retries with backoff instead of
    // dropping the activity; a gone key or a bad signature is permanent (401).
    return check.reason === "no-key"
      ? json({ error: "Cannot verify signature: no public key" }, 503)
      : json({ error: "Invalid HTTP signature" }, 401);
  }

  // The shared inbox has no recipient in the URL: resolve it from the
  // activity's object (e.g. a Follow's object is the local actor). Per-user
  // deliveries go through /api/users/[username]/inbox instead.
  let recipient: { id: string; username: string; privateKeyPem: string } | null = null;
  const targetId = typeof body.object === "string" ? body.object : (body.object as { id?: string })?.id;
  if (targetId) {
    const r = await getActorById(env.DB, targetId);
    if (r?.privateKeyPem) recipient = { id: r.id, username: r.username, privateKeyPem: r.privateKeyPem };
  }

  try {
    await processInboxActivity(body as never, {
      db: env.DB,
      baseUrl,
      signingActorId,
      signingKey,
      queue: env.DELIVERY_QUEUE,
      ...(recipient ? { recipient } : {}),
    });
  } catch (err) {
    // Still return 202 so the remote server does not keep retrying.
    console.error("[inbox] processInboxActivity failed:", err);
  }

  return json({ status: "accepted" }, 202);
}
