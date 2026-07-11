import { type NextRequest } from "next/server";
import { getCloudflareContext, json, badRequest, unauthorized, notFound } from "@/lib/cf";
import { getShortLinkById, getActorById, getFollowerIds, createActivity, deleteShortLink, deleteObject } from "@/lib/db";
import { generateId, buildDelete } from "@/lib/activitypub/utils";
import { enqueueDeliveries } from "@/lib/activitypub/queue";
import { collectFollowerInboxes } from "@/lib/activitypub/federation";
import { getSessionActor } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { env } = getCloudflareContext();
  const { id } = await params;

  const authHeader = _request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return unauthorized();
  const session = await getSessionActor(env.DB, token);
  if (!session) return unauthorized();

  const link = await getShortLinkById(env.DB, id);
  if (!link) return notFound();

  if (link.actorId !== session.id) return unauthorized();

  const domain = new URL(_request.url).hostname;
  const baseUrl = `https://${domain}`;

  if (link.objectId) {
    const deleteAct = buildDelete(baseUrl, session.id, link.objectId, generateId());
    await createActivity(env.DB, {
      id: deleteAct.id,
      type: "Delete",
      actorId: session.id,
      objectId: link.objectId,
      toList: JSON.stringify(deleteAct.to ?? []),
      ccList: "[]",
      raw: JSON.stringify(deleteAct),
      isLocal: true,
    });
    await deleteObject(env.DB, link.objectId);

    const actor = await getActorById(env.DB, session.id);
    if (actor?.privateKeyPem) {
      const followerIds = await getFollowerIds(env.DB, session.id);
      if (followerIds.length > 0) {
        const fetchActorFn = async (id: string) => getActorById(env.DB, id);
        const inboxes = await collectFollowerInboxes(followerIds, fetchActorFn);
        if (inboxes.length > 0) {
          await enqueueDeliveries(env.DELIVERY_QUEUE, inboxes, JSON.stringify(deleteAct), session.id);
        }
      }
    }
  }

  await deleteShortLink(env.DB, id);

  await env.DB.prepare("UPDATE actors SET links_count = MAX(0, links_count - 1) WHERE id = ?").bind(session.id).run();

  return json({ success: true });
}
