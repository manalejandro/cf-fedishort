# FediShort

Un acortador de enlaces federado impulsado por **ActivityPub** y **Cloudflare** (Next.js + D1 + Workers).

Acorta URLs y compártelas a través del fediverso. Cada enlace corto es una Nota ActivityPub que se federa automáticamente a tus seguidores.

## Características

- **Federación ActivityPub** — Cada enlace corto es una Nota federada. Los seguidores ven tus enlaces en su línea de tiempo.
- **Acortador de URLs** — Crea enlaces cortos y memorables con slugs personalizados.
- **Bilingüe** — Interfaz en inglés y español.
- **Stack Cloudflare** — Construido con Next.js, base de datos D1, Workers Queues, y desplegado vía OpenNext.
- **Código Abierto** — Código fuente completo bajo MIT.

## Stack Tecnológico

| Capa       | Tecnología                          |
| ---------- | ----------------------------------- |
| Framework  | Next.js 16                          |
| Base de Datos | Cloudflare D1 (SQLite)          |
| Cola       | Cloudflare Workers Queues           |
| Runtime    | Cloudflare Workers (vía OpenNext)   |
| Estilos    | Tailwind CSS v4                     |
| Auth       | PBKDF2 hashing de contraseñas + sesiones |
| Federación | ActivityPub (WebFinger, HTTP Signatures) |

## Primeros Pasos

### Prerrequisitos

- Node.js 20+
- Cuenta de Cloudflare con D1, Queues y Workers habilitados
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Instalación

```bash
npm install
```

### Base de Datos

Crea la base de datos D1:

```bash
wrangler d1 create cf-fedishort
```

Copia el ID de la base de datos en `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cf-fedishort"
database_id = "tu-id-de-base-de-datos"
```

Ejecuta la migración del esquema:

```bash
wrangler d1 execute cf-fedishort --remote --file=lib/db/schema.sql
```

### Cola

Crea la cola de entrega:

```bash
wrangler queue create cf-fedishort-delivery
```

### Variables de Entorno

Configura los secretos:

```bash
wrangler secret put TURNSTILE_SECRET
```

### Desarrollo

```bash
npm run dev
```

### Despliegue

```bash
npm run deploy
```

Esto ejecuta `opennextjs-cloudflare build && wrangler deploy`.

## Estructura del Proyecto

```
cf-fedishort/
├── app/                    # Páginas y rutas API de Next.js App Router
│   ├── api/
│   │   ├── auth/           # Registro e inicio de sesión
│   │   ├── inbox/          # Bandeja de entrada compartida de ActivityPub
│   │   ├── links/          # CRUD de enlaces
│   │   ├── nodeinfo/       # Endpoint NodeInfo
│   │   └── users/          # Actor, inbox, outbox, seguidores, siguiendo
│   ├── l/[slug]            # Redirección de enlace corto
│   ├── links/              # Página de enlaces del usuario
│   ├── objects/[id]        # Objetos Note de ActivityPub
│   ├── users/[username]    # Páginas de perfil de usuario
│   └── .well-known/        # WebFinger, descubrimiento NodeInfo
├── lib/
│   ├── activitypub/        # Núcleo de ActivityPub (seguridad, utils, federación, inbox, vocabulario, cola)
│   ├── db/                 # Esquema de base de datos D1 y capa de acceso
│   ├── i18n/               # Diccionario de internacionalización
│   └── types/              # Tipos TypeScript
├── src/
│   └── worker.ts           # Punto de entrada del Worker Cloudflare + consumidor de cola
├── middleware.ts            # Middleware Next.js para CORS y reescritura de URLs
├── next.config.ts           # Configuración de Next.js
├── open-next.config.ts      # Configuración del adaptador OpenNext Cloudflare
└── wrangler.toml            # Configuración de Cloudflare Workers
```

## Endpoints API

### ActivityPub

| Endpoint | Descripción |
|---|---|
| `GET /.well-known/webfinger?resource=acct:user@domain` | Descubrimiento WebFinger |
| `GET /.well-known/nodeinfo` | Descubrimiento NodeInfo |
| `GET /api/nodeinfo/2.0` | Payload NodeInfo |
| `GET /api/users/:username` | Actor JSON-LD |
| `POST /api/users/:username/inbox` | Bandeja de entrada por usuario |
| `POST /api/inbox` | Bandeja de entrada compartida |
| `GET /api/users/:username/outbox` | Colección de salida |
| `GET /api/users/:username/followers` | Colección de seguidores |
| `GET /api/users/:username/following` | Colección de seguidos |
| `GET /objects/:id` | Nota ActivityPub |

### Auth y Enlaces

| Endpoint | Descripción |
|---|---|
| `POST /api/auth/register` | Registrar un nuevo usuario |
| `POST /api/auth/login` | Iniciar sesión |
| `GET /api/links` | Obtener enlaces del usuario (auth requerida) |
| `POST /api/links` | Crear un enlace corto (auth requerida) |
| `GET /l/:slug` | Redirigir a la URL original |

## Soporte Bilingüe

La interfaz está disponible en **inglés** y **español**. Cambia de idioma con el selector en la barra de navegación.

## Licencia

MIT
