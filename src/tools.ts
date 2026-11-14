// Curated tool registry for the SportWizzard REST v1 API.
//
// Each descriptor maps one MCP tool onto one REST endpoint. We deliberately
// expose a *curated* high-value subset of the 27 v1 endpoints (data: odds,
// stats, events/context; derived: edges, arbitrage; discovery/reference)
// rather than one tool per path. The one endpoint we intentionally do NOT
// expose is /api/v1/snapshot — it's a ~40MB gzip blob of every live market,
// meant for bulk consumers, and would overflow any agent context window.

export type ParamType = "string" | "number" | "integer" | "boolean";

export interface ToolParam {
  name: string; // snake_case — matches both the MCP arg and the REST query/path param
  type: ParamType;
  description: string;
  enum?: string[];
}

export interface ToolDef {
  name: string;
  description: string;
  /** REST path template. `{param}` placeholders are filled from pathParams. */
  path: string;
  pathParams?: ToolParam[];
  queryParams?: ToolParam[];
  /** mock-mode fixture key (see mock.ts). */
  mockKey: string;
  /** Params that are consumed by a custom handler, not sent to the API. Required in the schema. */
  localParams?: ToolParam[];
  /**
   * Whether this tool makes sense over a remote (Streamable HTTP) connection.
   * Defaults to true. `download_snapshot` writes to a path on the *server's*
   * filesystem — meaningful for stdio (server runs on the caller's machine)
   * but not for the hosted multi-tenant server, so it's excluded there.
   */
  remoteSafe?: boolean;
  /** Remote snapshot variant: return CDN URL + save_command instead of writing a file. */
  snapshotUrlMode?: boolean;
}

const LIMIT: ToolParam = {
  name: "limit",
  type: "integer",
  description: "Max rows to return (page size). Default 50, server caps apply.",
};
const CURSOR: ToolParam = {
  name: "cursor",
  type: "string",
  description:
    "Opaque pagination cursor. Pass the `nextCursor` from a previous response to fetch the next page.",
};
const SCOPE: ToolParam = {
  name: "scope",
  type: "string",
  description:
    "Which KIND of market to return. `event` = single-game markets. `season` = season-long futures (division/conference/championship winners, awards, team win totals, season leaders, full-season player props). `tournament` = golf/tennis tournament outrights — a different product from season futures. Exact match: `season` does NOT include TOURNAMENT rows. Omit for all scopes (the default). An unrecognised value returns 400 listing the valid ones, so a typo can never look like \"no futures exist\".",
  enum: ["event", "season", "tournament"],
};

export const TOOLS: ToolDef[] = [
  // ---- Events (the spine) ---------------------------------------------------
  {
    name: "list_events",
    description:
      "List sporting events / fixtures (the spine of the API). Each event carries its `competition` code, `startTime`, status, whether live odds exist (hasOdds) and `participants`: who takes part, ordered by side. A participant is {side, sideLabel, position, name}: team sports have two competitors, side 1 `home` and side 2 `away`; tennis, MMA and esports have side 1 and side 2 with no label (order is arbitrary); doubles have two players per side (position 1 and 2); golf lists the whole field with no sides. `competitorId` / `playerId` on each participant are sent only to an API key on a paid plan. Filter by competition, competitor (competitor_id), player (player_id), status or start-time window, then use the returned event id with get_event_odds. Paginate with cursor.",
    path: "/api/v1/events",
    queryParams: [
      { name: "competition", type: "string", description: "Competition code (e.g. mlb, wnba, mls, pga-tour, fifa-world-cup). See list_competitions." },
      { name: "competitor_id", type: "string", description: "Filter to events where this competitor (UUID from list_competitors) is a participant." },
      { name: "player_id", type: "string", description: "Filter to events where this player (UUID from list_players) is a participant, e.g. a tennis player's matches or a golfer's tournaments." },
      { name: "status", type: "string", description: "Event status filter (e.g. scheduled, live, final)." },
      { name: "starts_after", type: "string", description: "ISO-8601 timestamp; only events starting at/after this time." },
      { name: "starts_before", type: "string", description: "ISO-8601 timestamp; only events starting at/before this time." },
      CURSOR,
      LIMIT,
    ],
    mockKey: "events",
  },
  {
    name: "get_event",
    description:
      "Full detail for a single event: participants (as in list_events, plus each side's final `score` once the box score exists), the latest live `state` when a source reported one ({status, period, clock, side1Score, side2Score, source, observedAt}), startTime, status, competition, venue, season year, and rich game context — weather, confirmed/projected lineups, probable pitchers, and officials where the competition provides them. The model-builder's pre-game context endpoint. Use an event id from list_events.",
    path: "/api/v1/events/{event_id}",
    pathParams: [
      { name: "event_id", type: "string", description: "Event UUID (from list_events)." },
    ],
    mockKey: "event_detail",
  },
  {
    name: "get_event_stats",
    description:
      "The box score for a single event: every player's stat line (e.g. batting_stats/pitching_stats JSON per player) plus the competitor-level result row (side1Id/side2Id, side1Score/side2Score, competitor stats). Use an event id from list_events; works for final and in-progress events that have stats.",
    path: "/api/v1/events/{event_id}/stats",
    pathParams: [
      { name: "event_id", type: "string", description: "Event UUID (from list_events)." },
    ],
    mockKey: "event_stats",
  },
  {
    name: "get_event_odds",
    description:
      "Get every sportsbook price for a single event: one flat row per book x market x selection, with american+decimal price, line, `outcomeCode` from SportWizzard's fixed list (OVER, UNDER, YES, NO, WIN, DRAW, NEITHER, WIN_OR_DRAW, EITHER, ODD, EVEN, SCORE, RANGE, OTHER, LABEL; a moneyline leg is WIN with its side), `statType` from the fixed stat list, `side` (1 or 2: which participant side the outcome is about; absent for totals, draws, neither and futures), `side1Score`/`side2Score` on exact-score outcomes, `outcomeParticipants` ([{kind: competitor or player, name}] as the sportsbook sent them; an outcome about a side with no name has none, so read the event participant on that side), and SportWizzard's devigged fair odds where available. Side 1 and side 2 match the event's participants. `playerId` and outcome participant `competitorId`/`playerId` are sent only to an API key on a paid plan. Use an event id from list_events. Season-long futures have no event; get them with get_odds and scope=season plus a competition/sportsbook filter.",
    path: "/api/v1/events/{event_id}/odds",
    pathParams: [
      { name: "event_id", type: "string", description: "Event UUID (from list_events)." },
    ],
    mockKey: "odds",
  },

  // ---- Odds (core, entity-scoped) ------------------------------------------
  {
    name: "get_odds",
    description:
      "Core odds query. Returns a flat array of book prices, narrowed by any combination of event_id, player_id, competitor_id, sportsbook, market, competition and scope. Rows carry `outcomeCode` and `side` (1/2) as described in get_event_odds. Called with no filters it paginates hard — narrow to at least one entity. Paginate with cursor.\n\n" +
      "FUTURES live here: pass scope=season for season-long futures (division/conference/championship winners, award odds, team win totals, season leaders, full-season player props — a PLAYER_TOTAL_PASS_YARDS at scope=season is a ~3,750.5 SEASON line, not a game line), or scope=tournament for golf/tennis outrights. Futures rows are described by three ORTHOGONAL axes: `marketScope` (SEASON | TOURNAMENT — what the market is about; omitted entirely on ordinary game rows), `period` (the window within that season: REG_SEASON settles at the end of the regular season, FULL runs through the playoffs) and `segment` (the slice of the competition: AFC_EAST, NFC_WEST, AL, NL, SEC ... — present only when the market is segment-scoped). READ `segment` — it is load-bearing: all 32 NFL DIVISION_WINNER selections share ONE seasonId (eventId is null on futures), so ignoring segment turns 8 separate division races into one nonsensical 32-team market.\n\n" +
      "Futures gotchas: winner/award markets are CATEGORICAL — one YES selection per competitor with no `side`, and most books offer no NO side, so these are not two-way markets. `eventStartTime` on a futures row is the season's END DATE (e.g. the Super Bowl date), NOT a kickoff. Every book's futures for a competition carry the same seasonId (eventId is null), so scope=season + competition is already a cross-book board. Futures are deliberately EXCLUDED from get_edges and get_arbitrage — season markets never enter de-vig or edge math (a product decision, not a gap).",
    path: "/api/v1/odds",
    queryParams: [
      { name: "event_id", type: "string", description: "Scope to one event (UUID from list_events)." },
      { name: "player_id", type: "string", description: "Scope to one player (UUID from list_players)." },
      { name: "competitor_id", type: "string", description: "Scope to events where this competitor (UUID from list_competitors) is a participant." },
      { name: "sportsbook", type: "string", description: "Sportsbook / DFS source id (e.g. draftkings, prizepicks). See list_sportsbooks." },
      { name: "market", type: "string", description: "Market FAMILY filter, matched as a substring (e.g. MONEYLINE, SPREAD, PLAYER_TOTAL, TEAM_TOTAL, CATEGORICAL). The specific token — DIVISION_WINNER, AWARD_MVP, SEASON_LEADER_PASS_YARDS, TEAM_TOTAL_WINS — is each row's `marketSubtype`, not this filter: winner/award futures live under market=CATEGORICAL. See list_markets." },
      { name: "competition", type: "string", description: "Competition code filter (see list_competitions)." },
      SCOPE,
      CURSOR,
      LIMIT,
    ],
    mockKey: "odds",
  },
  {
    name: "get_player_odds",
    description:
      "All current book prices for a single player across events and markets (player props). Use a player id from list_players. Paginate with cursor. This endpoint has NO scope filter, so the rows can mix game props with season-long futures (award odds, full-season stat lines) — those carry marketScope=SEASON and eventStartTime = the season's end date, not a kickoff. To split them, use get_odds with player_id plus scope=event or scope=season.",
    path: "/api/v1/players/{player_id}/odds",
    pathParams: [
      { name: "player_id", type: "string", description: "Player UUID (from list_players)." },
    ],
    queryParams: [CURSOR, LIMIT],
    mockKey: "odds",
  },
  {
    name: "get_competitor_odds",
    description:
      "All current book prices on events where this competitor (a team) is a participant. Use a competitor id from list_competitors. Paginate with cursor.",
    path: "/api/v1/competitors/{competitor_id}/odds",
    pathParams: [
      { name: "competitor_id", type: "string", description: "Competitor UUID (from list_competitors)." },
    ],
    queryParams: [CURSOR, LIMIT],
    mockKey: "odds",
  },

  // ---- Derived (the moat) ---------------------------------------------------
  {
    name: "get_edges",
    description:
      "SportWizzard's edge finder: DFS/book offers that are +EV versus the devigged fair market, with the edge %, the book(s) setting fair value, and per-book odds. Each row carries the event's `participants` and the offer's `outcomeCode` (OVER/UNDER ...); `playerId` is sent only to an API key on a paid plan. Filter by competition, source (DFS/book), minimum edge, or a single event. Paginate with cursor. GAME markets only: season and tournament futures are excluded by design — they never enter de-vig or edge math, so an empty result here says nothing about futures coverage (query those with get_odds scope=season).",
    path: "/api/v1/edges",
    queryParams: [
      { name: "competition", type: "string", description: "Competition code filter (see list_competitions)." },
      { name: "source", type: "string", description: "DFS/book source id to find edges for (e.g. prizepicks, underdog)." },
      { name: "min_edge", type: "number", description: "Minimum edge threshold (e.g. 5 for 5%)." },
      { name: "event_id", type: "string", description: "Scope to a single event UUID." },
      CURSOR,
      LIMIT,
    ],
    mockKey: "edges",
  },
  {
    name: "get_arbitrage",
    description:
      "Arbitrage scanner: cross-book opportunities with a guaranteed profit, including the event's `participants`, each leg (source, selection, `outcomeCode`, `side` 1/2 where the leg is about one side, odds) and the optimal stake fractions. Player and source-reference IDs are sent only to an API key on a paid plan. Filter by type (two_way | three_way) and minimum profit %. Paginate with cursor. GAME markets only: season and tournament futures are excluded by design (categorical winner/award markets have no NO side to arb against and never enter de-vig math).",
    path: "/api/v1/arbitrage",
    queryParams: [
      { name: "type", type: "string", description: "Arbitrage type.", enum: ["two_way", "three_way"] },
      { name: "min_profit", type: "number", description: "Minimum guaranteed profit % (e.g. 1 for 1%)." },
      CURSOR,
      LIMIT,
    ],
    mockKey: "arbitrage",
  },

  // ---- Reference / discovery ------------------------------------------------
  {
    name: "list_players",
    description:
      "List players (reference resource). Filter by competition and/or competitor. Returns player UUIDs to use with get_player_odds and get_player_stats. Paginate with cursor.",
    path: "/api/v1/players",
    queryParams: [
      { name: "competition", type: "string", description: "Competition code filter (see list_competitions)." },
      { name: "competitor_id", type: "string", description: "Competitor UUID filter (from list_competitors)." },
      CURSOR,
      LIMIT,
    ],
    mockKey: "players",
  },
  {
    name: "list_competitors",
    description:
      "List competitors, i.e. teams (reference resource). Filter by competition. Returns competitor UUIDs to use with list_events(competitor_id), get_competitor_odds and get_competitor_stats. Paginate with cursor.",
    path: "/api/v1/competitors",
    queryParams: [
      { name: "competition", type: "string", description: "Competition code filter (see list_competitions)." },
      CURSOR,
      LIMIT,
    ],
    mockKey: "competitors",
  },
  {
    name: "get_player_stats",
    description:
      "Historical / season statistics for a single player. Use a player id from list_players; optionally scope to one season.",
    path: "/api/v1/players/{player_id}/stats",
    pathParams: [
      { name: "player_id", type: "string", description: "Player UUID (from list_players)." },
    ],
    queryParams: [
      { name: "season", type: "integer", description: "Season year (e.g. 2026). Omit for all available." },
    ],
    mockKey: "player_stats",
  },
  {
    name: "get_competitor_stats",
    description:
      "Per-game stats and results for a single competitor (side1Id/side2Id and side1Score/side2Score, result, competitor stat JSON per event). Use a competitor id from list_competitors; optionally scope to one season.",
    path: "/api/v1/competitors/{competitor_id}/stats",
    pathParams: [
      { name: "competitor_id", type: "string", description: "Competitor UUID (from list_competitors)." },
    ],
    queryParams: [
      { name: "season", type: "integer", description: "Season year (e.g. 2026). Omit for all available." },
    ],
    mockKey: "competitor_stats",
  },
  {
    name: "get_player_game_logs",
    description:
      "Bulk per-game player stat rows (game logs) filtered by player, competitor, or event — the model-training data feed. At least one of player_id / competitor_id / event_id is required. Each row is one player-game with the raw stat JSON. Paginate with cursor.",
    path: "/api/v1/stats/players",
    queryParams: [
      { name: "player_id", type: "string", description: "Player UUID (from list_players)." },
      { name: "competitor_id", type: "string", description: "Competitor UUID (from list_competitors)." },
      { name: "event_id", type: "string", description: "Event UUID (from list_events)." },
      CURSOR,
      LIMIT,
    ],
    mockKey: "player_game_logs",
  },
  {
    name: "download_snapshot",
    description:
      "Download the full live odds board to a file on disk instead of returning it (it is too large for a context window). Provide an absolute save_path: a path ending in .gz keeps the gzip; any other path writes decompressed JSON. Pass include_history=true to include each selection's selectionPrice (line movement: each row {observedAt, lastObservedAt, priceAmerican, priceDecimal, dfsMultiplier, suspended (only when true), liquidityTier (exchanges)}, oldest first, one row per run of an unchanged price; costs 5 credits flat instead of 1 — selectionPrice is null without it). Markets carry `phase` (PRE or LIVE) and exchange selections their current `liquidityTier`. Returns the saved path, byte count and ETag. Re-poll cheaply by passing the returned etag: unchanged data returns not_modified without downloading (each variant has its own etag).",
    path: "/api/v1/snapshot",
    localParams: [
      { name: "save_path", type: "string", description: "Absolute file path to write the snapshot to. `.gz` suffix keeps it gzip-compressed; otherwise decompressed JSON is written." },
      { name: "etag", type: "string", description: "Optional: the etag from a previous download. If the board hasn't changed the server returns 304 and nothing is downloaded." },
      { name: "include_history", type: "boolean", description: "true = populate every selection's selectionPrice entries (5 credits flat vs 1). Identical schema either way — selectionPrice is null when false." },
    ],
    mockKey: "snapshot_file",
    remoteSafe: false,
  },
  {
    name: "get_account_usage",
    description:
      "Your API plan and usage: plan tier, per-minute rate limit, monthly usage/cap where metered. Works without a key (shows the effective anonymous plan).",
    path: "/api/v1/account/usage",
    mockKey: "usage",
  },
  {
    name: "list_sportsbooks",
    description:
      "List the sportsbook and DFS source IDs used by SportWizzard. Reference/discovery — call this to learn valid `sportsbook` filter values.",
    path: "/api/v1/sportsbooks",
    mockKey: "sportsbooks",
  },
  {
    name: "list_competitions",
    description:
      "List the competitions currently covered with live markets. Reference/discovery — call this to learn valid `competition` filter values.",
    path: "/api/v1/competitions",
    mockKey: "competitions",
  },
  {
    name: "list_markets",
    description:
      "List the market types SportWizzard supports. Reference/discovery — call this to learn valid `market` filter values.",
    path: "/api/v1/markets",
    mockKey: "markets",
  },
  {
    name: "status",
    description:
      "Check whether the customer data API is responding. This does not report global cache inventory.",
    path: "/api/v1/status",
    mockKey: "status",
  },
];

/**
 * Remote (hosted) variant of download_snapshot: the hosted server cannot write
 * to the CUSTOMER's filesystem, but the customer's agent can. So this variant
 * returns the snapshot's CDN download URL + current ETag + a ready-to-run
 * command templated with the agent's save_path; the agent executes it locally
 * and the bytes flow straight from the CDN — never through this MCP server and
 * never into the context window. Post-billing this same shape will carry a
 * short-lived presigned URL instead of the public CDN URL.
 */
export const REMOTE_SNAPSHOT_TOOL: ToolDef = {
  name: "download_snapshot",
  description:
    "Get the full live odds board as a direct CDN download_url with the current etag and a ready-to-run save_command for the save_path you provide. Run the command in your own shell; the file downloads straight from the CDN, not through this server. Pass include_history=true for the variant with each selection's selectionPrice populated (line movement: each row {observedAt, lastObservedAt, priceAmerican, priceDecimal, dfsMultiplier, suspended (only when true), liquidityTier (exchanges)}, oldest first, one row per run of an unchanged price; selectionPrice is null without it). Re-check cheaply by passing the previous etag: if the board hasn't changed you get not_modified and skip the download (each variant has its own etag).",
  path: "/api/v1/snapshot",
  localParams: [
    { name: "save_path", type: "string", description: "Absolute file path ON YOUR MACHINE where you intend to save it; used to template save_command. `.gz` suffix keeps gzip; otherwise the command decompresses to JSON." },
    { name: "etag", type: "string", description: "Optional: etag from a previous call. Unchanged board returns not_modified — no download needed." },
    { name: "include_history", type: "boolean", description: "true = the with-history CDN object (every selection's selectionPrice populated). Identical schema either way." },
  ],
  mockKey: "snapshot_file",
  snapshotUrlMode: true,
};

/** The subset of TOOLS exposed over the remote Streamable HTTP transport. */
export const REMOTE_TOOLS: ToolDef[] = TOOLS.filter((t) => t.remoteSafe !== false).concat([
  REMOTE_SNAPSHOT_TOOL,
]);
