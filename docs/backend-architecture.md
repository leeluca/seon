# Backend Architecture (Server)

Defines the target structure for the server package with multi-runtime support and clear service boundaries.

## Principles

- Thin server: auth and sync only; client DB is source of truth.
- Multi-runtime: works on Node.js and Cloudflare Workers without code changes.
- Service-oriented: routes delegate to services; services own business logic.
- Hybrid caching: expensive operations (JWT keys) cached globally; service instances per-request.
- Explicit dependencies: services receive dependencies via factory functions.

## Target Directory Layout (packages/server/src)

```
packages/server/src/

├── index.ts                  # Entry point (Node.js startup, Workers export)
├── app.ts                    # Hono app factory, middleware registration
├── env.ts                    # Typed env schema + validation
│
├── routes/
│   └── auth.ts               # Thin route handlers (delegate to services)
│
├── services/
│   ├── auth.service.ts       # Auth business logic (signin, signup, tokens)
│   ├── jwt.service.ts        # JWT operations (sign, verify, cookies)
│   └── password.ts           # Password hashing (stateless utilities)
│
├── middleware/
│   └── auth.ts               # Access validation middleware
│
├── db/
│   ├── db.ts                 # Database connection factory
│   ├── schema.ts             # Drizzle table definitions
│   └── relations.ts          # Drizzle relations
│
├── types/
│   ├── context.ts            # Hono context types (Variables, service types)
│   └── validation.ts         # Request validation schemas (TypeBox)
│
├── constants/
│   └── config.ts             # Cookie settings, feature flags
│
└── utils/
    ├── id.ts                 # UUID generation/validation
    └── validation.ts         # TypeBox parsing helpers
```

## Layer Responsibilities

- `index.ts` / `app.ts`: composition only (runtime detection, middleware wiring, route registration).
- `services/*`: business logic; own auth flows, token management, credential validation; no HTTP concerns.
- `routes/*`: thin handlers; validate input, call services, return responses.
- `middleware/*`: cross-cutting concerns (auth validation, context setup).
- `db/*`: data access; schema definitions, connection management.

## Service Layer Details

- `jwt.service.ts`: owns JWT signing, verification, cookie management; caches keys globally; service instance created per-request.
- `auth.service.ts`: owns signin/signup flows, refresh token rotation, credential validation; receives JWT service as dependency.
- `password.ts`: stateless utilities for hashing and comparison; no service wrapper needed.

## Caching Strategy

- JWT keys (RSA import): cached globally; expensive (~50ms), immutable after init.
- JWT configs: cached globally; derived from keys, immutable.
- Service instances: created per-request; lightweight objects, allows context access.
- DB connection: global singleton with lazy init; connection pooling handled by driver.

## Route Handler Guidelines

- Keep handlers thin: validate, delegate, respond.
- Use TypeBox validators (`tbValidator`) for request validation.
- Return consistent response shapes.
- Delegate all business logic and DB access to services.
- Access services via Hono context (`c.get('authService')`).

## Service Initialization

- Services initialized in middleware, stored in Hono context variables.
- JWT service created first (async, requires key init on cold start).
- Auth service receives JWT service as dependency.
- Per-request instantiation enables context access without global state for service logic.

## Multi-Runtime Guidelines

- Use `getRuntimeKey()` from `hono/adapter` for runtime detection.
- Access env vars via `env(c)` for Workers compatibility.
- Conditional imports for Node.js-specific code (`@hono/node-server`).
- Export default fetch handler for Workers entry.

## Environment Configuration

- All env vars defined in `env.ts` with TypeBox schema.
- Access via `env(c)` from `hono/adapter`, never `process.env` directly.
- Validation runs at app startup; fails fast on missing/invalid vars.

## Testing Conventions

- `resetJWTCache()` available for test isolation (clears global key cache).
- Mock services by setting context variables directly in tests.
- Integration tests use real middleware chain with test database.
