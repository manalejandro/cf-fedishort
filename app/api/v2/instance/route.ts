import { type NextRequest } from "next/server";
import { getCloudflareContext, json } from "@/lib/cf";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest): Promise<Response> {
  const { env } = getCloudflareContext();

  const userCount = await (env.DB as any).prepare("SELECT COUNT(*) as count FROM actors WHERE is_local = 1").first() as { count: number } | null;

  return json({
    domain: new URL(env.INSTANCE_URL || "https://fedishort.com").hostname,
    title: env.INSTANCE_TITLE || "FediShort",
    version: "4.3.0+compatible",
    source_url: "https://github.com/manalejandro/cf-fedishort",
    description: env.INSTANCE_DESCRIPTION || "Short links, federated.",
    usage: { users: { active_month: userCount?.count ?? 0 } },
    thumbnail: null,
    languages: ["en"],
    configuration: {
      accounts: { max_featured_tags: 0 },
      statuses: { max_characters: 500, max_media_attachments: 0 },
      media_attachments: {
        supported_mime_types: [],
        image_size_limit: 0,
        image_matrix_limit: 0,
        video_size_limit: 0,
        video_frame_rate_limit: 0,
        video_matrix_limit: 0,
      },
      polls: {
        max_options: 0,
        max_characters_per_option: 0,
        min_expiration: 300,
        max_expiration: 2629746,
      },
    },
    registrations: true,
    contact: { email: "" },
    rules: [],
  });
}
