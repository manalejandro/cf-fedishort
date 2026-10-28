import { type NextRequest } from "next/server";
import { activityJson, notFound } from "@/lib/cf";
import { getObjectById, getActorById } from "@/lib/db";
import { buildLinkNote } from "@/lib/activitypub/utils";
import { env } from "cloudflare:workers";

interface ObjectShortLink {
  slug: string;
  url: string;
  title: string | null;
  description: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;
  const objectId = `${baseUrl}/objects/${id}`;

  // The short link associated with this object carries the human-facing slug
  // (`/l/<slug>`); the object uuid is NOT a slug and would 404.
  const link = await env.DB
    .prepare("SELECT slug, url, title, description FROM short_links WHERE object_id = ?")
    .bind(objectId)
    .first<ObjectShortLink>();

  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("json")) {
    if (!link) return notFound("Object not found");
    return Response.redirect(`${baseUrl}/l/${link.slug}`, 302);
  }

  const obj = await getObjectById(env.DB, objectId);
  if (!obj || !obj.local) return notFound("Object not found");

  const author = await getActorById(env.DB, obj.actorId);
  if (!author || !author.isLocal) return notFound("Object not found");

  const slug = link?.slug ?? id;
  const targetUrl = link?.url ?? obj.url;

  const note = buildLinkNote(baseUrl, id, {
    actorUsername: author.username,
    url: targetUrl,
    title: link?.title ?? undefined,
    description: link?.description ?? undefined,
    slug,
    published: obj.published,
  });

  return activityJson(note);
}
