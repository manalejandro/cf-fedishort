# FediShort

A federated link shortener powered by **ActivityPub** and **Cloudflare** (Next.js + D1 + Workers).

Shorten URLs and share them across the fediverse. Each short link is an ActivityPub Note that federates automatically to your followers.

## Features

- **ActivityPub Federation** — Every short link is a federated Note. Followers see your links in their home feed.
- **URL Shortening** — Create short, memorable links with custom slugs.
- **Bilingual** — English and Spanish interface.
- **Cloudflare Stack** — Built with Next.js, D1 database, Workers Queues, and deployed via OpenNext.
- **Open Source** — Full source available under MIT.

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | Next.js 16                          |
| Database  | Cloudflare D1 (SQLite)              |
| Queue     | Cloudflare Workers Queues           |
| Runtime   | Cloudflare Workers (via OpenNext)   |
| Styles    | Tailwind CSS v4                     |
| Auth      | PBKDF2 password hashing + sessions  |
| Federation| ActivityPub (WebFinger, HTTP Signatures) |

## Getting Started

### Prerequisites

- Node.js 20+
- Cloudflare account with D1, Queues, and Workers enabled
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Setup

```bash
npm install
```

### Database

Create the D1 database:

```bash
wrangler d1 create cf-fedishort
```

Copy the database ID into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cf-fedishort"
database_id = "your-database-id"
```

Run the schema migration:

```bash
wrangler d1 execute cf-fedishort --remote --file=lib/db/schema.sql
```

### Queue

Create the delivery queue:

```bash
wrangler queue create cf-fedishort-delivery
```

### Environment Variables

Set secrets:

```bash
wrangler secret put TURNSTILE_SECRET
```

### Development

```bash
npm run dev
```

### Deploy

```bash
npm run deploy
```

This runs `opennextjs-cloudflare build && wrangler deploy`.

## Project Structure

```
cf-fedishort/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── auth/           # Registration & login
│   │   ├── inbox/          # Shared ActivityPub inbox
│   │   ├── links/          # Link CRUD
│   │   ├── nodeinfo/       # NodeInfo endpoint
│   │   └── users/          # Actor, inbox, outbox, followers, following
│   ├── l/[slug]            # Short link redirect
│   ├── links/              # User links page
│   ├── objects/[id]        # ActivityPub Note objects
│   ├── users/[username]    # User profile pages
│   └── .well-known/        # WebFinger, NodeInfo discovery
├── lib/
│   ├── activitypub/        # ActivityPub core (security, utils, federation, inbox, vocab, queue)
│   ├── db/                 # D1 database schema & access layer
│   ├── i18n/               # Internationalization dictionary
│   └── types/              # TypeScript types
├── src/
│   └── worker.ts           # Cloudflare Worker entry point + Queue consumer
├── middleware.ts            # Next.js middleware for CORS & URL rewrites
├── next.config.ts           # Next.js configuration
├── open-next.config.ts      # OpenNext Cloudflare adapter config
└── wrangler.toml            # Cloudflare Workers configuration
```

## API Endpoints

### ActivityPub

| Endpoint | Description |
|---|---|
| `GET /.well-known/webfinger?resource=acct:user@domain` | WebFinger discovery |
| `GET /.well-known/nodeinfo` | NodeInfo discovery |
| `GET /api/nodeinfo/2.0` | NodeInfo payload |
| `GET /api/users/:username` | Actor JSON-LD |
| `POST /api/users/:username/inbox` | Per-user inbox |
| `POST /api/inbox` | Shared inbox |
| `GET /api/users/:username/outbox` | Outbox collection |
| `GET /api/users/:username/followers` | Followers collection |
| `GET /api/users/:username/following` | Following collection |
| `GET /objects/:id` | ActivityPub Note |

### Auth & Links

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Register a new user |
| `POST /api/auth/login` | Login |
| `GET /api/links` | Get user's links (auth required) |
| `POST /api/links` | Create a short link (auth required) |
| `GET /l/:slug` | Redirect to original URL |

## Bilingual Support

The interface is available in **English** and **Spanish**. Switch via the language toggle in the navigation bar.

## License

MIT
