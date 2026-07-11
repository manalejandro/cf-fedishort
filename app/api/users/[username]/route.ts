import { type NextRequest } from "next/server";
import { getCloudflareContext, activityJson, notFound } from "@/lib/cf";
import { getActorByUsername } from "@/lib/db";
import { buildActor } from "@/lib/activitypub/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  const { env } = getCloudflareContext();
  const { username } = await params;
  const domain = new URL(request.url).hostname;

  const accept = request.headers.get("Accept") ?? "";
  if (accept.includes("text/html") && !accept.includes("application/activity+json")) {
    return Response.redirect(`https://${domain}/@${username}`, 302);
  }

  const actor = await getActorByUsername(env.DB, username, domain);
  if (!actor || !actor.isLocal) return notFound("Actor not found");

  const baseUrl = `https://${domain}`;
  const apActor = buildActor(baseUrl, actor.username, {
    displayName: actor.displayName ?? undefined,
    summary: actor.summary ?? undefined,
    avatarUrl: actor.avatarUrl,
    headerUrl: actor.headerUrl,
    publicKeyPem: actor.publicKeyPem,
    followersCount: actor.followersCount,
    followingCount: actor.followingCount,
    published: actor.createdAt,
  });

  return activityJson(apActor);
}
