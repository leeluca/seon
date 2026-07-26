# Backend architecture

The server is intentionally narrow: identity, email-based account recovery,
sync authorization, and atomic upload persistence.

## Authentication

- Better Auth is mounted at `/api/auth/*` through Hono.
- Sessions are revocable database records with a 90-day rolling lifetime and a
  maximum daily renewal.
- A signed 15-minute cookie cache avoids a session-table read on every request.
  Revocation on another device can therefore take up to 15 minutes to become
  visible; the current device's signout cookie is cleared immediately.
- Browser credentials are HttpOnly, secure, same-site cookies. Browser code
  does not persist access or refresh tokens.
- Email verification is required before sync. Verification and password reset
  emails use the provider-neutral `EmailSender`; Resend is the production
  adapter. Delivery runs outside the response path so provider timing and
  failures cannot reveal whether an email address is registered.
- The JWT plugin issues a separate minimal 15-minute RS256 token only when an
  authenticated PowerSync connection requests `/api/sync/credentials`.

The identity tables (`user`, `session`, `account`, `verification`, `jwks`) are
owned by Better Auth. Application preferences live in `profile`, not in the
identity model.

## Sync API

The browser never has database credentials. `POST /api/sync/transactions`:

1. derives the owner from the Better Auth session;
2. validates a strict goal/entry/profile allowlist;
3. checks row and relationship ownership without revealing foreign records;
4. claims `(userId, workspaceClientId, transactionId)` for idempotency;
5. applies the whole local transaction or none of it;
6. records semantic rejections so the browser can move them into its local
   `sync_error` table rather than blocking the queue. Because uploads are
   atomic, valid sibling operations are also recorded instead of being silently
   discarded when one operation is rejected.

Server arrival order is the conflict rule: the last successfully committed
upload wins. Client-provided `userId` and `updatedAt` values are never trusted.

PowerSync is a download adapter, configured in
`packages/server/powersync/sync-streams.yaml`. Replacing it does not change the
upload or auth contracts.

## Schema changes

`0002_auth_sync_reset.sql` intentionally clears pre-launch custom-auth users,
goals, entries, and refresh tokens. `0003_auth_sync_schema.sql` installs the
Better Auth/profile/idempotency schema. They are generated artifacts only:
neither development nor deployment runs them automatically.

Apply and validate them manually against disposable staging Postgres before
cutover, then reconfigure PowerSync publication/streams and JWKS settings.
