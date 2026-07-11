import { type NextRequest } from "next/server";
import { getCloudflareContext, activityJson, notFound } from "@/lib/cf";
import { getObjectById, getActorById, getShortLinkById } from "@/lib/db";
import { buildLinkNote } from "@/lib/activitypub/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { env } = getCloudflareContext();
  const { id } = await params;
  const domain = new URL(request.url).hostname;
  const baseUrl = `https://${domain}`;

  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("json")) {
    return Response.redirect(`${baseUrl}/l/${id}`, 302);
  }

  const objectId = `${baseUrl}/objects/${id}`;
  const obj = await getObjectById(env.DB, objectId);
  if (!obj || !obj.local) return notFound("Object not found");

  const author = await getActorById(env.DB, obj.actorId);
  if (!author || !author.isLocal) return notFound("Object not found");

  // Find the short link associated with this object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link = await (env.DB as any)
    .prepare("SELECT * FROM short_links WHERE object_id = ?")
    .bind(objectId)
    .first() as { slug: string; url: string; title: string | null; description: string | null } | null;

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
