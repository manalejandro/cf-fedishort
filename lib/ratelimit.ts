/**
 * Lightweight D1-backed rate limiter for abuse-prone endpoints (login,
 * registration, password reset emails, remote resolves).
 *
 * Counters live in the `rate_limits` table (see lib/db/schema.sql). The
 * SELECT + INSERT/UPDATE pair is not atomic across isolates, so concurrent
 * bursts can slip a few requests through right at the boundary — acceptable
 * for abuse mitigation, not for hard quotas.
 */

import type { D1Database } from "@/lib/types/env";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets (best effort). */
  retryAfter: number;
}

interface RateLimitRow {
  count: number;
  reset_at: string;
}

/**
 * Consume one unit from the `limit` allowed per `windowSeconds` for `key`.
 * Fails open on D1 errors so a database outage does not lock everyone out.
 */
export async function consumeRateLimit(
  db: D1Database,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const row = await db
      .prepare("SELECT count, reset_at FROM rate_limits WHERE key = ?")
      .bind(key)
      .first<RateLimitRow>();

    const now = Date.now();
    // reset_at is stored as an ISO-8601 UTC string ("...Z"), unambiguous for Date.parse.
    const resetAt = row?.reset_at ? Date.parse(row.reset_at) : NaN;

    if (!row || !Number.isFinite(resetAt) || resetAt <= now) {
      // Start a fresh window; the batch also sweeps keys whose window expired
      // so the table does not grow unbounded.
      const newReset = new Date(now + windowSeconds * 1000).toISOString();
      await db.batch([
        db
          .prepare(
            "INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at"
          )
          .bind(key, newReset),
        db.prepare("DELETE FROM rate_limits WHERE reset_at <= ?").bind(new Date(now).toISOString()),
      ]);
      return { ok: true, remaining: Math.max(0, limit - 1), retryAfter: windowSeconds };
    }

    if (row.count >= limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    }

    // Keep the original window; bump the counter.
    await db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();
    return {
      ok: true,
      remaining: Math.max(0, limit - row.count - 1),
      retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  } catch (err) {
    // Fail open on D1 errors so an outage does not lock everyone out,
    // but keep a log for observability.
    console.error("[ratelimit] D1 error, failing open:", err);
    return { ok: true, remaining: limit, retryAfter: windowSeconds };
  }
}

/** Client IP as seen by Cloudflare (falls back to "unknown"). */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** 429 response with a proper Retry-After header. */
export function tooManyRequests(retryAfter: number, message = "Too many requests"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}
