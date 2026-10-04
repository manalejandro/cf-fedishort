// Cloudflare Worker entry point.
// After building with `opennextjs-cloudflare build`, the generated
// .open-next/worker.js is used as the main handler.
// This file exports the Queue consumer for ActivityPub delivery.

import type { MessageBatch } from "@cloudflare/workers-types";
import { postToInboxSigned, validateOutboundUrl } from "../lib/activitypub/federation";
import type { APDeliveryMessage } from "../lib/activitypub/queue";

/** Permanent HTTP failure codes — don't retry, just ack. */
const PERMANENT_ERRORS = new Set([400, 401, 403, 404, 410, 422]);

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  [key: string]: unknown;
}

/** `Retry-After` in seconds (both delta-seconds and HTTP-date forms). */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.ceil(seconds), 86_400);
  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.max(0, Math.min(Math.ceil((date - Date.now()) / 1000), 86_400));
  }
  return null;
}

async function deliverOne(
  inboxUrl: string,
  activityJson: string,
  actorId: string,
  env: Env
): Promise<{ ok: boolean; permanent: boolean; status: number; retryAfter?: number }> {
  // SSRF guard: inbox URLs originate from remote actor documents / user input.
  // Never POST to non-HTTPS, private, or local addresses.
  const validation = validateOutboundUrl(inboxUrl);
  if (!validation.valid) {
    console.warn(`[worker] Blocked delivery to ${inboxUrl}: ${validation.reason}`);
    return { ok: false, permanent: true, status: 0 };
  }

  // Look up the local actor's private key.
  const row = await env.DB
    .prepare("SELECT private_key_pem FROM actors WHERE id = ? AND is_local = 1")
    .bind(actorId)
    .first<{ private_key_pem: string }>();

  if (!row?.private_key_pem) {
    // Actor not found or not local — permanent failure, don't retry.
    return { ok: false, permanent: true, status: 0 };
  }

  const keyId = `${actorId}#main-key`;

  try {
    // Signed POST (safeFetch re-validates redirect hops and bounds the
    // timeout): draft-cavage first, retrying with RFC 9421 on 400/401.
    const res = await postToInboxSigned(inboxUrl, activityJson, keyId, row.private_key_pem, 15_000);
    if (!res) return { ok: false, permanent: true, status: 0 };
    // We only need the status; cancel the body so concurrent deliveries don't
    // stall on unread responses (Cloudflare deadlock protection).
    await res.body?.cancel().catch(() => {});
    return {
      ok: res.ok,
      permanent: PERMANENT_ERRORS.has(res.status),
      status: res.status,
      retryAfter: parseRetryAfter(res.headers.get("Retry-After")) ?? undefined,
    };
  } catch {
    return { ok: false, permanent: false, status: 0 };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (await import("../.open-next/worker.js")) as any;
    return handler.default.fetch(request, env, ctx);
  },

  async queue(batch: MessageBatch<APDeliveryMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const body = message.body;
      if (!body) { message.ack(); continue; }
      const { type, inboxUrl, activityJson, actorId } = body;
      if (type !== "delivery") { message.ack(); continue; }
      try {
        const { ok, permanent, retryAfter } = await deliverOne(inboxUrl, activityJson, actorId, env);
        if (ok || permanent) message.ack();
        else message.retry({ delaySeconds: retryAfter ?? Math.min(60 * message.attempts, 3600) });
      } catch {
        message.retry();
      }
    }
  },
};
