import { type NextRequest } from "next/server";
import { getCloudflareContext, json, badRequest, unauthorized } from "@/lib/cf";
import { getActorById, createFollow, getFollow, updateActorCounts, createNotification } from "@/lib/db";
import { buildFollow, generateId } from "@/lib/activitypub/utils";
import { deliverToInbox, resolveWebFinger, fetchRemoteObject } from "@/lib/activitypub/federation";
import { getSessionActor } from "@/lib/auth";

export async function POST(request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return unauthorized();
  const session = await getSessionActor(env.DB, token);
  if (!session) return unauthorized();

  const { targetId } = await request.json() as { targetId?: string };
  if (!targetId) return badRequest("Missing targetId");

  // Fetch the current local actor for signing
  const localActor = await getActorById(env.DB, session.id);
  if (!localActor || !localActor.privateKeyPem) return badRequest("Actor not found or no private key");

  // Check if we already follow
  const existing = await getFollow(env.DB, localActor.id, targetId);
  if (existing && existing.state !== "rejected") {
    return json({ error: "Already following or request pending" }, 409);
  }

  // Resolve/cache the target actor
  let targetActor = await getActorById(env.DB, targetId);
  if (!targetActor) {
    // Try to fetch remote actor
    const fetched = await fetchRemoteObject(targetId) as { id: string; preferredUsername: string; inbox?: string; endpoints?: { sharedInbox?: string }; publicKey?: { publicKeyPem: string }; name?: string; summary?: string; icon?: { url?: string }; image?: { url?: string } } | null;
    if (!fetched?.publicKey?.publicKeyPem) return badRequest("Could not resolve target actor");

    const domain = new URL(fetched.id).hostname;
    await env.DB
      .prepare("INSERT OR REPLACE INTO actors (id, username, domain, display_name, summary, avatar_url, header_url, public_key_pem, inbox, is_local, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))")
      .bind(fetched.id, fetched.preferredUsername, domain, fetched.name ?? null, fetched.summary ?? null, fetched.icon?.url ?? null, fetched.image?.url ?? null, fetched.publicKey.publicKeyPem, fetched.inbox ?? null)
      .run();
    targetActor = await getActorById(env.DB, targetId);
  }
  if (!targetActor?.inbox) return badRequest("Target actor has no inbox");

  const followId = generateId();
  const followActivity = buildFollow(env.INSTANCE_URL || `https://${session.domain}`, localActor.id, targetId, followId);

  // Store as pending
  await createFollow(env.DB, {
    id: followId,
    actorId: localActor.id,
    targetId,
    state: "pending",
    activityId: followActivity.id,
  });

  // Deliver to target's inbox
  const result = await deliverToInbox(
    targetActor.inbox,
    followActivity,
    `${localActor.id}#main-key`,
    localActor.privateKeyPem
  );

  // If the target is local, the inbox handler will auto-accept. But since we're
  // delivering directly (not through the inbox), we need to handle local follows here.
  if (targetActor.isLocal) {
    // Auto-accept local follows
    await env.DB
      .prepare("UPDATE follows SET state = 'accepted' WHERE id = ?")
      .bind(followId)
      .run();
    await updateActorCounts(env.DB, localActor.id, { followingCount: (localActor.followingCount ?? 0) + 1 });
    const target = await getActorById(env.DB, targetId);
    if (target) {
      await updateActorCounts(env.DB, targetId, { followersCount: (target.followersCount ?? 0) + 1 });
    }
    // Notify the target
    await createNotification(env.DB, {
      id: generateId(),
      type: "follow",
      accountId: localActor.id,
      targetAccountId: targetId,
    });
  }

  return json({
    followId,
    state: targetActor.isLocal ? "accepted" : "pending",
    targetId,
  }, 201);
}
