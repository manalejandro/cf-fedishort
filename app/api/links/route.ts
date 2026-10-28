import { type NextRequest } from "next/server";
import { json, badRequest, unauthorized } from "@/lib/cf";
import { getShortLinksByActor, createShortLink, createObject, getFollowerIds, getActorById, createActivity, deleteObject, bumpActorCount } from "@/lib/db";
import { generateId, buildLinkNote, buildCreate } from "@/lib/activitypub/utils";
import { enqueueDeliveries } from "@/lib/activitypub/queue";
import { collectFollowerInboxes } from "@/lib/activitypub/federation";
import { getSessionActor } from "@/lib/auth";
import { env } from "cloudflare:workers";

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return unauthorized();
  const session = await getSessionActor(env.DB, token);
  if (!session) return unauthorized();

  const links = await getShortLinksByActor(env.DB, session.id);
  return json(links);
}

export async function POST(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return unauthorized();
  const session = await getSessionActor(env.DB, token);
  if (!session) return unauthorized();

  let body: { url?: string; slug?: string; title?: string; description?: string };
  try {
    body = await request.json() as { url?: string; slug?: string; title?: string; description?: string };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.url) return badRequest("URL is required");

  const targetUrl = body.url.trim();
  if (targetUrl.length > 2048) return badRequest("URL too long (max 2048 characters)");
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return badRequest("Invalid URL");
    }
  } catch {
    return badRequest("Invalid URL");
  }

  const slug = body.slug?.trim().toLowerCase() ?? generateId().slice(0, 8);
  if (!/^[a-z0-9-_]+$/.test(slug)) return badRequest("Slug can only contain letters, numbers, hyphens and underscores");
  if (slug.length > 64) return badRequest("Slug too long (max 64 characters)");

  // Check slug uniqueness (the INSERT below is the authoritative guard).
  const existing = await env.DB.prepare("SELECT id FROM short_links WHERE slug = ?").bind(slug).first();
  if (existing) return json({ error: "Slug already taken" }, 409);

  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;
  const noteId = generateId();
  const linkId = generateId();
  const objectId = `${baseUrl}/objects/${noteId}`;
  const published = new Date().toISOString();

  const note = buildLinkNote(baseUrl, noteId, {
    actorUsername: session.username,
    url: targetUrl,
    title: body.title ?? undefined,
    description: body.description ?? undefined,
    slug,
    published,
  });

  await createObject(env.DB, {
    id: objectId,
    type: "Note",
    actorId: session.id,
    content: note.content,
    visibility: "public",
    url: `${baseUrl}/l/${slug}`,
    published,
    local: true,
    raw: JSON.stringify(note),
  });

  try {
    await createShortLink(env.DB, {
      id: linkId,
      slug,
      actorId: session.id,
      url: targetUrl,
      title: body.title,
      description: body.description,
      objectId,
      published,
    });
  } catch (err) {
    // UNIQUE(slug) collision: the pre-check above is racy, this is the guard.
    // Remove the orphaned object so a retry with another slug stays clean.
    await deleteObject(env.DB, objectId).catch(() => {});
    if (String(err).includes("UNIQUE")) {
      return json({ error: "Slug already taken" }, 409);
    }
    console.error("[links] createShortLink failed:", err);
    return json({ error: "Failed to create link" }, 500);
  }

  const create = buildCreate(baseUrl, session.id, note, generateId());

  await createActivity(env.DB, {
    id: create.id,
    type: "Create",
    actorId: session.id,
    objectId,
    toList: JSON.stringify(note.to),
    ccList: JSON.stringify(note.cc),
    raw: JSON.stringify(create),
    isLocal: true,
  });

  // Federate to followers
  const actor = await getActorById(env.DB, session.id);
  if (actor?.privateKeyPem) {
    const followerIds = await getFollowerIds(env.DB, session.id);
    if (followerIds.length > 0) {
      const fetchActorFn = async (id: string) => getActorById(env.DB, id);
      const inboxes = await collectFollowerInboxes(followerIds, fetchActorFn);
      if (inboxes.length > 0) {
        await enqueueDeliveries(
          env.DELIVERY_QUEUE,
          inboxes,
          JSON.stringify(create),
          session.id,
          `${actor.id}#main-key`,
          actor.privateKeyPem
        );
      }
    }
  }

  await bumpActorCount(env.DB, session.id, "links_count", 1);

  return json({
    id: linkId,
    slug,
    url: targetUrl,
    shortUrl: `${baseUrl}/l/${slug}`,
    objectId,
    title: body.title ?? null,
    description: body.description ?? null,
  }, 201);
}
