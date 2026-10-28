import { type NextRequest } from "next/server";
import { json } from "@/lib/cf";
import { deleteSession } from "@/lib/auth";
import { env } from "cloudflare:workers";

/**
 * Logout: revoke the session behind the Bearer token. Best-effort by design —
 * an invalid/expired token is answered with the same 200 so the client can
 * always clear its local state.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      await deleteSession(env.DB, token);
    } catch (err) {
      console.error("[logout] Error:", err);
    }
  }
  return json({ success: true });
}
