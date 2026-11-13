# SportWizzard MCP Server

Query live sports-betting data — **odds, player props, +EV edges, arbitrage, stats and reference data** from 35+ sportsbooks and DFS apps — from any MCP-capable AI agent (Claude Code, Claude Desktop, Codex, Cursor, …).

20 read-only tools over the [SportWizzard REST v1 API](https://sportwizzard.com/developers), available two ways: a **hosted remote server** (zero install) and a **stdio server** via `npx`. Get a free API key at <https://sportwizzard.com/account> (API Keys tab — no card required).

## Hosted (recommended — zero install)

```bash
claude mcp add --transport http sportwizzard https://mcp.sportwizzard.com/mcp \
  --header "Authorization: Bearer sw_live_your_api_key_here"
```

```bash
codex mcp add sportwizzard --transport http --url https://mcp.sportwizzard.com/mcp \
  --header "Authorization: Bearer sw_live_your_api_key_here"
```

The hosted server is a thin proxy: your key is forwarded to the SportWizzard API, which enforces auth and rate limits. All 20 tools work on both transports. (`download_snapshot` on the hosted server returns a ready-to-run `save_command` your agent executes locally, plus the CDN `download_url` when the download is public; with an API key and `include_history=true` the command uses the keyed history route instead. On stdio it writes the file directly.)

Successful authenticated live tool calls send a best-effort account-usage
receipt. The measurement request contains no tool arguments or result data.
For hosted `download_snapshot`, a successful CDN HEAD check counts because
the tool has verified that the returned download URL is reachable; a failed
HEAD check does not count.

## Stdio (local)

```bash
npx -y sportwizzard-mcp
```

Claude Code:

```bash
claude mcp add sportwizzard -e SPORTWIZZARD_API_KEY=sw_live_your_api_key_here -- npx -y sportwizzard-mcp
```

Claude Desktop (`claude_desktop_config.json` — macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "sportwizzard": {
      "command": "npx",
      "args": ["-y", "sportwizzard-mcp"],
      "env": { "SPORTWIZZARD_API_KEY": "sw_live_your_api_key_here" }
    }
  }
}
```

### Mock mode (no key, no network)

Set `SPORTWIZZARD_MOCK=1` to get canned sample responses — useful for wiring up an integration before you have a key.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `SPORTWIZZARD_API_KEY` | _(none)_ | Your API key, sent as `X-Api-Key`. |
| `SPORTWIZZARD_BASE_URL` | `https://api.sportwizzard.com` | Override the API base URL. |
| `SPORTWIZZARD_MOCK` | _(off)_ | `1` = canned sample data, no network. |

## Tools

| Tool | What it does |
|---|---|
| `list_events` / `get_event` | Events/fixtures with their participants — filter by competition, competitor, player, status, time; full detail incl. each side's score, the latest live `state`, weather, lineups, probable pitchers. |
| `get_event_stats` | Box score: every player's stat line + competitor results for one event. |
| `get_odds` / `get_event_odds` / `get_player_odds` / `get_competitor_odds` | Current prices, scoped by event, player, competitor, sportsbook, market, or competition. `get_odds` also takes `scope`: `event` (game markets), `season` (season-long futures), `tournament` (golf/tennis outrights); omit for all. |
| `get_edges` | +EV edges vs. devigged fair market (competition, source, min_edge filters). |
| `get_arbitrage` | Arbitrage opportunities with legs and stake fractions (two/three-way). |
| `list_players` / `list_competitors` / `get_player_stats` / `get_competitor_stats` | Reference data and season/historical stats. |
| `get_player_game_logs` | Bulk per-game stat rows — the model-training feed. |
| `download_snapshot` | Save the full live board to disk (tens of MB gzip). `include_history: true` also populates every selection's `selectionPrice` rows (same schema; 5 credits flat vs 1). |
| `list_sportsbooks` / `list_competitions` / `list_markets` / `status` | Discover source IDs, covered competitions and supported market types; check customer API availability. |
| `get_account_usage` | Your plan tier, rate limit, and monthly usage. |

Every response uses the envelope `{ success, data, nextCursor, meta }`; when `nextCursor` is present the tool appends a `_paging` hint so agents know to continue.

### Participants and sides

Events, edges and arbitrage rows list who takes part as `participants`, ordered by side:

| Event | `participants` |
|---|---|
| NBA: Hawks at Wizards | `{side: 1, sideLabel: "home", position: 1, name: "Washington Wizards"}`, `{side: 2, sideLabel: "away", position: 1, name: "Atlanta Hawks"}` |
| Tennis singles | `{side: 1, position: 1, name: "Brandon Nakashima"}`, `{side: 2, position: 1, name: "Matteo Berrettini"}` (no label: order is arbitrary, as in MMA and esports) |
| Tennis doubles | two players per side, `position` 1 and 2 |
| Golf | the whole field, `{name}` only, no sides |

`get_event` adds each side's final `score` and, when a source reported one, the latest live `state` (`{status, period, clock, side1Score, side2Score, source, observedAt}`).

Each odds row is one outcome of a selection:

- `side`: `1` or `2`, the event side the outcome is about; absent for totals, draws, "neither" and futures.
- `outcomeCode`: SportWizzard's fixed list: `OVER`, `UNDER`, `YES`, `NO`, `WIN` (a moneyline leg is `WIN` with its `side`), `DRAW`, `NEITHER`, `WIN_OR_DRAW`, `EITHER`, `ODD`, `EVEN`, `SCORE` (read `side1Score`/`side2Score`), `RANGE`, `OTHER`, `LABEL` (a categorical answer only the selection label explains).
- `statType`: the fixed stat list (`points`, `rush_yards`, …).
- `outcomeParticipants`: `[{kind: "competitor" | "player", name}]`, names exactly as the sportsbook sent them. An outcome about a side with no name has none; read the event participant on that `side`.

Markets carry `phase` (`PRE` or `LIVE`). With `include_history`, each selection's `selectionPrice` is a list of rows, oldest first, one per run of an unchanged price:

```json
{"observedAt": "2026-11-03T12:31:02Z", "lastObservedAt": "2026-11-03T12:40:15Z", "priceAmerican": -110, "priceDecimal": 1.9091}
```

A row may also carry `dfsMultiplier`, `suspended: true` and, on exchanges, `liquidityTier`.

IDs depend on your key: with an API key on a paid plan, each participant and outcome participant also has `competitorId` (a team) or `playerId` (a person), and odds, edge and arbitrage rows carry `playerId` and source references. Without a key, or on the Free plan, you get names and sides. `competitor_id` and `player_id` filters match events where that competitor or player is a participant.

### Futures (season-scope markets)

`get_odds` with `scope=season` returns season-long futures — division/conference/championship winners, award odds, team win totals, season leaders and full-season player props. Three orthogonal axes describe them:

- **`marketScope`** — what the market is about: `SEASON` or `TOURNAMENT`. Omitted entirely on ordinary game rows.
- **`period`** — the window within that season: `REG_SEASON` (settles at the end of the regular season) or `FULL` (runs through the playoffs).
- **`segment`** — which slice of the competition: `AFC_EAST`, `NL`, `SEC`, … Present only when the market is segment-scoped, and load-bearing: all 32 NFL `DIVISION_WINNER` selections share **one** `seasonId` (their `eventId` is null), so without `segment` they read as a single 32-team race instead of 8 divisions.

Notes: winner/award markets are categorical (one `YES` selection per competitor, no `side`, usually no NO side); `eventStartTime` on a futures row is the season's end date, **not** a kickoff; every book's futures for a competition share the same `seasonId`, and `eventId` is null; and futures are deliberately excluded from `get_edges` / `get_arbitrage` (they never enter de-vig or edge math). Scope matching is exact — `season` does not include `TOURNAMENT` — and an invalid value returns HTTP 400 naming the valid ones.

## From source

```bash
git clone https://github.com/sportwizzard/sportwizzard-mcp.git
cd sportwizzard-mcp && npm install && npm run build
SPORTWIZZARD_MOCK=1 node dist/index.js   # or set SPORTWIZZARD_API_KEY
```

## Maintainers

This README ships inside the npm package, so keep it free of internal
hostnames, keys and private notes (the repository is public).

**Layout.** `src/index.ts` is the stdio entry (`dist/index.js`, the npm `bin`);
`src/httpServer.ts` is the hosted Streamable HTTP entry (stateless, one request
per POST; Host allow list and bearer-key handling); `src/auth.ts` validates the
caller's key against the API, caches it and applies the per-key rate limit;
`src/tools.ts` and `src/server.ts` define and register tools; `src/client.ts`
is the REST client and `src/mock.ts` the `SPORTWIZZARD_MOCK=1` data.
`tests/stdio-smoke.mjs` and `tests/http-smoke.mjs` are end-to-end smokes
against a loopback mock API (no credentials, no production calls).

**Build and verify** (the PR check, `.github/workflows/ci.yml`, runs the same
pack-and-smoke plus a no-push container build):

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
snapshot download with history; the HTTP smoke checks `/healthz`, key
rejection, the Host allow list, `tools/list`, key forwarding and a clean
SIGTERM exit. Both prove transport and packaging, not live data quality.

**Releasing.**

- Hosted server: `publish-container.yml` publishes a SHA-tagged GHCR image on
  every push to `main`. It deploys only when that digest is promoted in the
  Ops `deployment/releases/api.yaml` row, which owns placement, limits and
  credential references.
- npm package: bump `version` in `package.json`, run
  `npm install --package-lock-only`, sync `server.json`, merge to `main`, then
  run the manual **Publish npm package** workflow (`publish-npm.yml`). It
  builds once, smokes the packed tarball and publishes those exact bytes
  through npm trusted publishing (OIDC; no npm token). Publishing npm does
  not update the hosted container.

**Gotchas.** Hosted runtime settings are `MCP_HTTP_PORT` (default 8091),
`MCP_ALLOWED_HOSTS`, `AUTH_CACHE_TTL_MS`, `RATE_LIMIT_PER_MIN`,
`SPORTWIZZARD_SNAPSHOT_URL` and `SPORTWIZZARD_SNAPSHOT_HISTORY_URL`, plus the
customer settings above. `download_snapshot` writes a file on stdio but returns
a `save_command` (and a CDN URL when public) on the hosted server. Never print or commit `~/.npmrc`.
Open work goes in GitHub issues in this repository.

## License

MIT © SportWizzard LLC
