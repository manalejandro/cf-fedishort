import { type NextRequest } from "next/server";
import { activityJson, notFound } from "@/lib/cf";
import { getActorByUsername, getShortLinksByActor } from "@/lib/db";
import { buildOrderedCollection, buildOrderedCollectionPage } from "@/lib/activitypub/utils";
import { env } from "cloudflare:workers";

// NOTE: there is deliberately no POST handler here. Publishing used to be
// allowed without authentication, which let anyone create and federate links
// signed with the local user's private key. The authenticated API for
// creating links is POST /api/links; Next.js answers 405 to POST here.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
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

  const collectionId = `${baseUrl}/users/${username}/outbox`;
  const page = request.nextUrl.searchParams.get("page");
  if (page === "true") {
    return activityJson(buildOrderedCollectionPage(collectionId, items, undefined, undefined));
  }

  // Mastodon's outbox carries `first` and `last` (`?page=true` and
  // `?page=true&min_id=0`).
  return activityJson(buildOrderedCollection(collectionId, items.length, `${collectionId}?page=true&min_id=0`));
}
