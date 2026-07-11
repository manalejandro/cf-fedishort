import type {
  D1Database,
  KVNamespace,
  Queue,
  Fetcher,
} from "@cloudflare/workers-types";

export type { D1Database, KVNamespace, Queue, Fetcher };

export interface CloudflareEnv {
  DB: D1Database;
  KV: KVNamespace;
  DELIVERY_QUEUE: Queue;
  ASSETS: Fetcher;
  INSTANCE_TITLE: string;
  INSTANCE_DESCRIPTION: string;
  INSTANCE_VERSION: string;
  INSTANCE_URL: string;
  NODE_ENV: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
}

declare global {
  interface CloudflareContext {
    env: CloudflareEnv;
    ctx: ExecutionContext;
  }
}
