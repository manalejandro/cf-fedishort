import { type NextRequest } from "next/server";
import { getCloudflareContext, json } from "@/lib/cf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
): Promise<Response> {
  const { version } = await params;
  if (version !== "2.0") return json({ error: "Unsupported version" }, 404);

  const { env } = getCloudflareContext();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userCount = await (env.DB as any).prepare("SELECT COUNT(*) as count FROM actors WHERE is_local = 1").first() as { count: number } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postCount = await (env.DB as any).prepare("SELECT COUNT(*) as count FROM objects WHERE is_local = 1").first() as { count: number } | null;

  return json({
    version: "2.0",
    software: { name: "fedishort", version: "0.1.0", repository: "https://github.com/manalejandro/cf-fedishort" },
    protocols: ["activitypub"],
    services: { inbound: [], outbound: [] },
    openRegistrations: true,
    usage: { users: { total: userCount?.count ?? 0, activeMonth: userCount?.count ?? 0 }, localPosts: postCount?.count ?? 0 },
    metadata: { nodeName: "FediShort", nodeDescription: "Short links, federated." },
  });
}
