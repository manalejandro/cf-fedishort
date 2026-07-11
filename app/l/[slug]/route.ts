import { type NextRequest } from "next/server";
import { getCloudflareContext, notFound } from "@/lib/cf";
import { getShortLinkBySlug, incrementLinkClicks } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { env } = getCloudflareContext();
  const { slug } = await params;

  const link = await getShortLinkBySlug(env.DB, slug);
  if (!link) return notFound("Link not found");

  // Increment click counter (fire and forget)
  await incrementLinkClicks(env.DB, link.id).catch(() => {});

  return Response.redirect(link.url, 302);
}
