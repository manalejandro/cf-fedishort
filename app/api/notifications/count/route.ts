import { type NextRequest } from "next/server";
import { json, unauthorized } from "@/lib/cf";
import { getUnreadNotificationCount } from "@/lib/db";
import { getSessionActor } from "@/lib/auth";
import { env } from "cloudflare:workers";

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return unauthorized();
  const session = await getSessionActor(env.DB, token);
  if (!session) return unauthorized();

  const count = await getUnreadNotificationCount(env.DB, session.id);
  return json({ count });
}
