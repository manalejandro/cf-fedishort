import { type NextRequest } from "next/server";
import { json } from "@/lib/cf";
import { env } from "cloudflare:workers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
): Promise<Response> {
  const { version } = await params;
  if (version !== "2.0") return json({ error: "Unsupported version" }, 404);

  // NodeInfo is a public discovery endpoint: degrade to zeroed stats instead
  // of 500 if the database is temporarily unavailable.
  let userCount = 0;
  let postCount = 0;
  let activeMonthCount = 0;
  try {
    const users = await env.DB
      .prepare("SELECT COUNT(*) as count FROM actors WHERE is_local = 1")
      .first() as { count: number } | null;
    const posts = await env.DB
      .prepare("SELECT COUNT(*) as count FROM objects WHERE is_local = 1")
      .first() as { count: number } | null;
    // Local actors touched in the last 30 days (profile updates, new links and
    // follow activity all bump actors.updated_at).
    const active = await env.DB
      .prepare("SELECT COUNT(*) as count FROM actors WHERE is_local = 1 AND updated_at > datetime('now', '-30 days')")
      .first() as { count: number } | null;
    userCount = users?.count ?? 0;
    postCount = posts?.count ?? 0;
    activeMonthCount = active?.count ?? 0;
  } catch (err) {
    console.error("[nodeinfo] DB stats unavailable:", err);
  }

  return json({
    version: "2.0",
    software: {
      name: "fedishort",
      version: env.INSTANCE_VERSION || "1.0.0",
      repository: "https://github.com/manalejandro/cf-fedishort",
    },
    protocols: ["activitypub"],
    services: { inbound: [], outbound: [] },
    openRegistrations: true,
    usage: {
      users: { total: userCount, activeMonth: activeMonthCount },
      localPosts: postCount,
    },
    metadata: {
      nodeName: env.INSTANCE_TITLE || "FediShort",
      nodeDescription: env.INSTANCE_DESCRIPTION || "Short links, federated.",
    },
  });
}
