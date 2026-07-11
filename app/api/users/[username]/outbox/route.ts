import { type NextRequest } from "next/server";
import { getCloudflareContext, activityJson, notFound, json } from "@/lib/cf";
import { getActorByUsername, getShortLinksByActor, getObjectById, getFollowerIds, createActivity, createObject, createShortLink } from "@/lib/db";
import { buildOrderedCollection, buildOrderedCollectionPage, buildLinkNote, buildCreate, generateId, followersIRI } from "@/lib/activitypub/utils";
import { enqueueDeliveries } from "@/lib/activitypub/queue";
import { collectFollowerInboxes } from "@/lib/activitypub/federation";
import { getActorById } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  const { env } = getCloudflareContext();
  const { username } = await params;
  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;

  const actor = await getActorByUsername(env.DB, username, domain);
  if (!actor || !actor.isLocal) return notFound("Actor not found");

  const links = await getShortLinksByActor(env.DB, actor.id);
  const items = links.map((link) => ({
    id: `${baseUrl}/activities/${link.id}`,
    type: "Create" as const,
    actor: `${baseUrl}/users/${username}`,
    published: link.published.includes("T") ? link.published : link.published.replace(" ", "T") + "Z",
    object: link.objectId ?? `${baseUrl}/objects/${link.id}`,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [`${baseUrl}/users/${username}/followers`],
  }));

  const page = request.nextUrl.searchParams.get("page");
  if (page === "true") {
    const collectionId = `${baseUrl}/users/${username}/outbox`;
    return activityJson(buildOrderedCollectionPage(collectionId, items, undefined, undefined));
  }

  return activityJson(buildOrderedCollection(`${baseUrl}/users/${username}/outbox`, items.length));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  const { env } = getCloudflareContext();
  const { username } = await params;
  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;

  const actor = await getActorByUsername(env.DB, username, domain);
  if (!actor || !actor.isLocal) return notFound("Actor not found");

  const body = await request.json() as Record<string, unknown>;

  if (body.type === "Create" && typeof body.object === "object" && body.object !== null) {
    const obj = body.object as Record<string, unknown>;
    if (obj.type === "Note") {
      const slug = (obj as Record<string, unknown>).slug as string ?? generateId().slice(0, 8);
      const targetUrl = obj.content as string ?? "";
      const title = obj.name as string ?? null;
      const description = obj.summary as string ?? null;
      const noteId = generateId();
      const published = new Date().toISOString();

      const note = buildLinkNote(baseUrl, noteId, {
        actorUsername: username,
        url: targetUrl,
        title: title ?? undefined,
        description: description ?? undefined,
        slug,
        published,
      });

      const objectId = `${baseUrl}/objects/${noteId}`;
      const linkId = generateId();

      await createObject(env.DB, {
        id: objectId,
        type: "Note",
        actorId: actor.id,
        content: note.content,
        visibility: "public",
        url: `${baseUrl}/l/${slug}`,
        published,
        local: true,
        raw: JSON.stringify(note),
      });

      await createShortLink(env.DB, {
        id: linkId,
        slug,
        actorId: actor.id,
        url: targetUrl,
        title,
        description,
        objectId,
        published,
      });

      const create = buildCreate(baseUrl, actor.id, note, generateId());

      await createActivity(env.DB, {
        id: create.id,
        type: "Create",
        actorId: actor.id,
        objectId,
        toList: JSON.stringify(note.to),
        ccList: JSON.stringify(note.cc),
        raw: JSON.stringify(create),
        isLocal: true,
      });

      if (actor.privateKeyPem) {
        const followerIds = await getFollowerIds(env.DB, actor.id);
        if (followerIds.length > 0) {
          const fetchActorFn = async (id: string) => {
            const a = await getActorById(env.DB, id);
            return a;
          };
          const inboxes = await collectFollowerInboxes(followerIds, fetchActorFn);
          if (inboxes.length > 0) {
            await enqueueDeliveries(env.DELIVERY_QUEUE, inboxes, JSON.stringify(create), actor.id);
          }
        }
      }

      await env.DB
        .prepare("UPDATE actors SET links_count = links_count + 1 WHERE id = ?")
        .bind(actor.id)
        .run();

      return json({
        id: objectId,
        type: "Note",
        url: `${baseUrl}/l/${slug}`,
        slug,
      }, 201);
    }
  }

  return json({ error: "Activity type not supported" }, 422);
}
