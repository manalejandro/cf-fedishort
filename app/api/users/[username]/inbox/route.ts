import { type NextRequest } from "next/server";
import { json } from "@/lib/cf";
import { processInboxActivity } from "@/lib/activitypub/inbox";
import { extractSigningKeyId } from "@/lib/activitypub/security";
import { verifyIncomingSignature } from "@/lib/activitypub/signer-key";
import { getActorByUsername } from "@/lib/db";
import { env } from "cloudflare:workers";

// 1 MB is far above any legitimate AP activity we accept.
const MAX_BODY_BYTES = 1_000_000;

// POST /users/:username/inbox — Personal inbox for federation delivery
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  const { username } = await params;
  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;

  // Cheap early-out on the declared size before buffering anything.
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "Payload too large" }, 413);
  }

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

  const sigKeyId = extractSigningKeyId(headers);
  const signingActorId = sigKeyId ? sigKeyId.replace(/#.*$/, "") : actorId;

  const recipient = await getActorByUsername(env.DB, username, domain);
  if (!recipient || !recipient.isLocal) return json({ error: "Not found" }, 404);

  let signingKey: { id: string; privateKeyPem: string } | undefined;
  if (recipient.privateKeyPem) {
    signingKey = { id: recipient.id, privateKeyPem: recipient.privateKeyPem };
  }

  const check = await verifyIncomingSignature(env.DB, {
    method: "POST",
    url: `${baseUrl}/users/${username}/inbox`,
    headers,
    body: rawBody,
    signingKeyId: sigKeyId ?? `${actorId}#main-key`,
    signingKey,
  });
  if (!check.ok) {
    const detail = check.status ? ` (HTTP ${check.status})` : "";
    console.warn(`[inbox] ${check.reason} for ${signingActorId}${detail} (user ${username})`);
    return check.reason === "no-key"
      ? json({ error: "Cannot verify signature: no public key" }, 503)
      : json({ error: "Invalid HTTP signature" }, 401);
  }

  if (recipient.privateKeyPem) {
    try {
      await processInboxActivity(body as never, {
        db: env.DB,
        baseUrl,
        signingActorId,
        signingKey,
        queue: env.DELIVERY_QUEUE,
        recipient: { id: recipient.id, username: recipient.username, privateKeyPem: recipient.privateKeyPem },
      });
    } catch (err) {
      // Still return 202 so the remote server does not keep retrying.
      console.error(`[inbox] processInboxActivity failed for user ${username}:`, err);
    }
  }

  return json({ status: "accepted" }, 202);
}
