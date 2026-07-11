import { type NextRequest } from "next/server";
import { getCloudflareContext, activityJson, notFound } from "@/lib/cf";
import { getActorByUsername, getFollowers } from "@/lib/db";
import { buildOrderedCollection, buildOrderedCollectionPage, actorIRI } from "@/lib/activitypub/utils";

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

  const followers = await getFollowers(env.DB, actor.id);
  const items = followers.map((f) => actorIRI(baseUrl, f.username));

  const page = request.nextUrl.searchParams.get("page");
  if (page === "true") {
    return activityJson(buildOrderedCollectionPage(`${baseUrl}/users/${username}/followers`, items));
  }

  return activityJson(buildOrderedCollection(`${baseUrl}/users/${username}/followers`, items.length));
}
