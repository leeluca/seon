# Cloudflare Pages API proxy

The catch-all Function forwards `/api` requests to the application server while
the browser continues to use same-origin URLs.

Configure `API_ORIGIN` as a Cloudflare Pages runtime variable for both the
production and preview environments. Its value must be an origin only, for
example `https://domain.com` (no path, query, or credentials).

For local Pages testing, copy `.dev.vars.example` to `.dev.vars`, build the web
app, and run Wrangler from `packages/web`:

```sh
pnpm build
pnpm exec wrangler pages dev dist
```

The repository intentionally does not contain a Wrangler configuration file.
The Pages project already exists with dashboard-managed settings; introducing a
partial file would make that file the deployment source of truth and could
overwrite settings that are not represented in this repository.
