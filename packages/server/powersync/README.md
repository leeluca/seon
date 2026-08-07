# PowerSync boundary

`sync-streams.yaml` is the current download adapter. Uploads never use the
PowerSync or Supabase database APIs directly; they go through Seon's
authenticated `POST /api/sync/transactions` endpoint.

Configure the PowerSync instance with:

- the Postgres source connection used by `DB_URL`;
- JWKS URL: `<BETTER_AUTH_URL>/api/auth/jwks`;
- issuer: `BETTER_AUTH_URL`;
- audience: `POWERSYNC_AUDIENCE`;
- user identity claim: JWT `sub`.

Then apply `sync-streams.yaml` using the PowerSync dashboard or CLI. Keep its
explicit projections: application ownership columns stay on the server and
must not be copied into the local workspace schema.

This configuration is deliberately outside migrations and is not applied by
`pnpm install`, builds, or deployments.
