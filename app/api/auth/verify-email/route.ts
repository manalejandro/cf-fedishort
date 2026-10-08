import { type NextRequest } from "next/server";

import { verifyEmailByToken } from "@/lib/db";
import { env } from "cloudflare:workers";

export async function GET(request: NextRequest): Promise<Response> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return Response.redirect(new URL("/?verified=false&reason=missing-token", request.url), 302);
  }

  const actorId = await verifyEmailByToken(env.DB, token);
  if (!actorId) {
    return Response.redirect(new URL("/?verified=false&reason=invalid-token", request.url), 302);
  }

  return Response.redirect(new URL("/?verified=true", request.url), 302);
}
