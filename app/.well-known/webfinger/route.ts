import { type NextRequest } from "next/server";
import { json, notFound } from "@/lib/cf";
import { getActorByUsername } from "@/lib/db";
import { env } from "cloudflare:workers";

export async function GET(request: NextRequest): Promise<Response> {
  const resource = request.nextUrl.searchParams.get("resource");
  if (!resource) return json({ error: "resource parameter required" }, 400);

  // WebFinger only answers for THIS instance: cached remote actors must not be
  // re-exported with local self links (federated discovery poisoning).
  let localDomain: string;
  try {
    localDomain = new URL(env.INSTANCE_URL).hostname.toLowerCase();
  } catch {
    localDomain = new URL(request.url).hostname.toLowerCase();
  }

  let username: string | null = null;
  let resourceDomain: string | null = null;

  if (resource.startsWith("acct:")) {
    const acct = resource.slice(5).replace(/^@/, "");
    const [user, host] = acct.split("@");
    username = user || null;
    resourceDomain = host ? host.toLowerCase() : localDomain;
  } else if (resource.startsWith("https://") || resource.startsWith("http://")) {
    try {
      const url = new URL(resource);
      const match = url.pathname.match(/\/users\/([^/]+)$/);
      if (match) {
        username = match[1];
        resourceDomain = url.hostname.toLowerCase();
      }
    } catch {
      return notFound("Invalid resource");
    }
  }

  if (!username || !resourceDomain) return notFound("Invalid resource");
  if (resourceDomain !== localDomain) return json({ error: "Not our domain" }, 404);

  const actor = await getActorByUsername(env.DB, username, localDomain);
  if (!actor || !actor.isLocal) return notFound("User not found");

  const baseUrl = `https://${localDomain}`;

  // CORS: next.config.ts already adds Access-Control-Allow-Origin for
  // /.well-known/* — setting it here too would duplicate the header.
  // No ostatus `subscribe` link: this instance has no /authorize-follow page.
  return new Response(
    JSON.stringify({
      subject: `acct:${actor.username}@${localDomain}`,
      aliases: [`${baseUrl}/@${actor.username}`, `${baseUrl}/users/${actor.username}`],
      links: [
        { rel: "http://webfinger.net/rel/profile-page", type: "text/html", href: `${baseUrl}/@${actor.username}` },
        { rel: "self", type: "application/activity+json", href: `${baseUrl}/users/${actor.username}` },
      ],
    }),
    { headers: { "Content-Type": "application/jrd+json; charset=utf-8" } }
  );
}
