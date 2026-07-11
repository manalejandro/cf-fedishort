import { type NextRequest } from "next/server";
import { getCloudflareContext, json, badRequest, unauthorized } from "@/lib/cf";
import { getActorById, getFollow, deleteFollow, updateActorCounts } from "@/lib/db";
import { buildUndo, buildFollow, generateId } from "@/lib/activitypub/utils";
import { deliverToInbox } from "@/lib/activitypub/federation";
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

  const localActor = await getActorById(env.DB, session.id);
  if (!localActor || !localActor.privateKeyPem) return badRequest("Actor not found");

  const existing = await getFollow(env.DB, localActor.id, targetId);
  if (!existing) return json({ error: "Not following this user" }, 404);

  // Build Undo{Follow} activity
  const originalFollow = buildFollow(env.INSTANCE_URL || `https://${session.domain}`, localActor.id, targetId, existing.activityId ?? generateId());
  const undoId = generateId();
  const undoActivity = buildUndo(env.INSTANCE_URL || `https://${session.domain}`, localActor.id, originalFollow, undoId);

  // Delete local follow record
  await deleteFollow(env.DB, localActor.id, targetId);

  // Update counts
  const target = await getActorById(env.DB, targetId);
  if (localActor.isLocal) {
    await updateActorCounts(env.DB, localActor.id, { followingCount: Math.max(0, (localActor.followingCount ?? 0) - 1) });
  }
  if (target && target.isLocal) {
    await updateActorCounts(env.DB, targetId, { followersCount: Math.max(0, (target.followersCount ?? 0) - 1) });
  }

  // Deliver to target's inbox if remote
  if (target?.inbox && !target.isLocal) {
    await deliverToInbox(
      target.inbox,
      undoActivity,
      `${localActor.id}#main-key`,
      localActor.privateKeyPem
    );
  }

  return json({ success: true });
}
