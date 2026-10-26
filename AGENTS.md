# SportWizzard MCP server

Public, MIT-licensed MCP server over the SportWizzard customer REST v1 API.
It ships two ways from one codebase: the `sportwizzard-mcp` npm package
(stdio) and the hosted HTTP container behind `mcp.sportwizzard.com`.
`README.md` is the customer-facing page and is published inside the npm
package, so keep maintainer detail here, not there.

## Layout

- `src/index.ts`: stdio entry point (`dist/index.js`, the npm `bin`).
- `src/httpServer.ts`: hosted Streamable HTTP entry point (stateless, one
  request per POST); Host allow list and bearer-key handling.
- `src/auth.ts`: validates the caller's key against the API, caches it and
  applies the per-key rate limit.
- `src/tools.ts`, `src/server.ts`: tool definitions and registration.
  `download_snapshot` writes a file on stdio but returns a CDN URL and a
  command on the hosted server.
- `src/client.ts`: REST client (`X-Api-Key`); `src/mock.ts`: canned data for
  `SPORTWIZZARD_MOCK=1`.
- `tests/stdio-smoke.mjs`, `tests/http-smoke.mjs`: end-to-end smokes against a
  loopback mock API (no credentials, no production calls).

## Build and verify

```bash
npm ci --ignore-scripts && npm run build
release_dir="$(mktemp -d)"
npm pack --ignore-scripts --pack-destination "$release_dir"
npm install --prefix "$release_dir/consumer" --omit=dev --ignore-scripts --no-audit --no-fund "$release_dir"/*.tgz
npm run smoke -- "$release_dir/consumer/node_modules/sportwizzard-mcp/dist/index.js" "$release_dir/smoke.json" "$release_dir"/*.tgz
npm run smoke:http -- "$release_dir/consumer/node_modules/sportwizzard-mcp/dist/httpServer.js" "$release_dir/http-smoke.json"
rm -rf "$release_dir"
```

The stdio smoke checks `tools/list`, `get_odds scope=season` forwarding and a
snapshot download with history. The HTTP smoke checks `/healthz`, key
rejection, the Host allow list, `tools/list`, key forwarding and a clean
SIGTERM exit. Both prove transport and packaging, not live data quality.
The PR check (`.github/workflows/ci.yml`) runs the same pack-and-smoke plus a
no-push container build.

## Releasing

- **Hosted server:** `publish-container.yml` runs on every push to `main` and
  publishes a SHA-tagged GHCR image with a
  `release-receipt-publish-container-<sha>` artifact. It deploys only when that
  digest is promoted in `sportwizzard-ops/deployment/releases/api.yaml`;
  placement, limits and credential references live there.
- **npm package:** bump `version` in `package.json`, run
  `npm install --package-lock-only`, sync `server.json`, merge to `main`, then
  run the manual **Publish npm package** workflow (`publish-npm.yml`) on
  `main`. It builds once, smokes the packed tarball and publishes those exact
  bytes through npm trusted publishing (OIDC; no npm token secret). The
  trusted publisher names `sportwizzard/sportwizzard-mcp` and
  `publish-npm.yml`. Publishing npm does not update the hosted container.
- Local npm CLI login is an owner task; see the aipack
  `account-integrations` skill's npm reference. Never print or commit
  `~/.npmrc` contents.

## Gotchas

- Hosted runtime settings: `MCP_HTTP_PORT` (default 8091),
  `MCP_ALLOWED_HOSTS`, `AUTH_CACHE_TTL_MS`, `RATE_LIMIT_PER_MIN`,
  `SPORTWIZZARD_SNAPSHOT_URL`, `SPORTWIZZARD_SNAPSHOT_HISTORY_URL`, plus the
  customer-facing ones in the README.
- Successful authenticated tool calls send a best-effort usage receipt with no
  tool arguments or results. Hosted `download_snapshot` counts only after its
  CDN HEAD check succeeds.
- The repository is public: no internal hostnames, keys or private notes in
  source or docs.

Open work goes in GitHub issues in `sportwizzard/sportwizzard-mcp`.
