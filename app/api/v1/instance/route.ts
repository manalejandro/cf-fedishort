import { type NextRequest } from "next/server";
import { getCloudflareContext, json } from "@/lib/cf";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();

  const userCount = await (env.DB as any).prepare("SELECT COUNT(*) as count FROM actors WHERE is_local = 1").first() as { count: number } | null;

  return json({
    uri: new URL(env.INSTANCE_URL || "https://fedishort.com").hostname,
    title: env.INSTANCE_TITLE || "FediShort",
    version: "4.3.0+compatible",
    short_description: env.INSTANCE_DESCRIPTION || "Short links, federated.",
    description: env.INSTANCE_DESCRIPTION || "Short links, federated.",
    email: "",
    urls: { streaming_api: "" },
    stats: { user_count: userCount?.count ?? 0, status_count: 0, domain_count: 0 },
    thumbnail: null,
    languages: ["en"],
    registrations: true,
    contact_account: null,
    rules: [],
  });
}
