import { type NextRequest } from "next/server";
import { notFound } from "@/lib/cf";
import { getShortLinkBySlug, incrementLinkClicks } from "@/lib/db";
import { env } from "cloudflare:workers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;

  const link = await getShortLinkBySlug(env.DB, slug);
  if (!link) return notFound("Link not found");

  // Increment click counter (fire and forget)
  await incrementLinkClicks(env.DB, link.id).catch(() => {});

  return Response.redirect(link.url, 302);
}
