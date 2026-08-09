# Cloudflare Workers runtime

The Worker and Node entrypoints run the same Hono application. Workers use a
request-scoped Postgres.js client through Hyperdrive; Node uses a process-level
client through `DB_URL`.

## Local development

Copy `.env.example` to `.env`, replace its local secrets, point both PostgreSQL
URLs at your local database, and run:

```sh
pnpm dev:worker
```

Use `pnpm dev:node` to run the Node adapter with the same `.env` file. Do not
also create `.dev.vars`; Wrangler ignores `.env` whenever `.dev.vars` exists.

Run `pnpm validate:runtimes` before deployment. It type-checks and builds both
entrypoints, checks generated Worker binding types, runs the Node and workerd
test suites, and rejects a Worker metafile containing the Node adapter.

## One-time production setup

Create a Hyperdrive configuration from the existing PostgreSQL connection and
disable query caching so authentication and post-write reads are never stale:

```sh
pnpm exec wrangler hyperdrive create seon-server-db \
  --connection-string "$DB_URL" \
  --caching-disabled
```

Save the returned ID as the `HYPERDRIVE_ID` GitHub environment variable. Store
`BETTER_AUTH_SECRET` and `RESEND_API_KEY` as GitHub environment secrets; the
deployment workflow uploads them as encrypted Worker secrets. The other values
used by `prepare:worker-deploy` are non-secret GitHub environment variables.

Provisioning Hyperdrive does not run or generate database migrations. Drizzle
migrations remain a Node-only administrative command.

## Production cutover

Use Workers Paid and deploy the Worker canary without changing the Pages
`API_ORIGIN`. Against an isolated canary account/workspace, verify:

- session cookie creation and refresh;
- sign-up plus deferred verification email delivery;
- JWKS creation and PowerSync token issuance;
- workspace goal and entry counts;
- a duplicated sync receipt remaining idempotent;
- one valid 500-operation sync transaction.

Check Workers observability for CPU-limit, cross-request I/O, Hyperdrive pool,
and transaction-timeout errors. Only after the canary is clean should the Pages
production and preview `API_ORIGIN` variables be changed to the Worker origin.

For rollback, run the manual `Deploy Server Node Fallback` workflow and point
`API_ORIGIN` back to the Fly origin. Do not replay failed mutations against the
fallback automatically.
