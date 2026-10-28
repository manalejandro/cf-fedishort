import { type NextRequest } from "next/server";
import { json, unauthorized } from "@/lib/cf";
import { markNotificationRead } from "@/lib/db";
import { getSessionActor } from "@/lib/auth";
import { env } from "cloudflare:workers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return unauthorized();
  const session = await getSessionActor(env.DB, token);
  if (!session) return unauthorized();

  const { id } = await params;
  // Scoped to the session owner: without target_account_id this is an IDOR
  // (any authenticated user could mark anyone's notifications as read).
  await markNotificationRead(env.DB, id, session.id);
  return json({ success: true });
}
