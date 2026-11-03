// Canned sample responses for SPORTWIZZARD_MOCK=1, so a developer can try the
// tools without an API key or network. Fixtures mirror real v1 envelope shapes
// (captured from api.sportwizzard.com) but are trimmed and clearly synthetic.
// Mock mode has no API key, so events, odds, edges and arbitrage use the
// signed-out shape: participant names and sides, no competitorId/playerId.

export const MOCK: Record<string, any> = {
  status: {
    success: true,
    data: [{ available: true }],
    meta: { count: 1, updated: "2026-07-09T16:58:29Z" },
    _mock: true,
  },
  competitions: {
    success: true,
    data: ["mlb", "brazil-sa", "fifa-world-cup", "wnba", "pga-tour", "mls"],
    meta: { count: 6, updated: "2026-07-09T16:58:29Z" },
    _mock: true,
  },
  sportsbooks: {
    success: true,
    data: [
      { id: "draftkings" },
      { id: "fanduel" },
      { id: "betmgm" },
      { id: "prizepicks" },
      { id: "underdog" },
    ],
    meta: { count: 5, updated: "2026-07-09T16:58:29Z" },
    _mock: true,
  },
  markets: {
    success: true,
    data: [
      { marketType: "MONEYLINE", marketSubtype: null },
      { marketType: "SPREAD", marketSubtype: null },
      { marketType: "PLAYER_TOTAL", marketSubtype: null },
    ],
    meta: { count: 3, updated: "2026-07-09T16:58:29Z" },
    _mock: true,
  },
  events: {
    success: true,
    data: [
      {
        id: "04618737-e571-44d9-befe-24c1d8b1be3f",
        startTime: "2026-07-09T17:10Z",
        status: "scheduled",
        competition: "mlb",
        hasOdds: true,
        participants: [
          { side: 1, sideLabel: "home", position: 1, name: "Tampa Bay Rays" },
          { side: 2, sideLabel: "away", position: 1, name: "New York Yankees" },
        ],
      },
      // Tennis: sides with no label, because order is arbitrary.
      {
        id: "55aaddff-d914-4417-b4d9-2c10596f13bd",
        startTime: "2026-11-03T13:00Z",
        status: "scheduled",
        competition: "tennis",
        hasOdds: true,
        participants: [
          { side: 1, position: 1, name: "Brandon Nakashima" },
          { side: 2, position: 1, name: "Matteo Berrettini" },
        ],
      },
    ],
    nextCursor: "MTc4MzYxNzAwMDAwMHwwNDYxODczNy1lNTcxLTQ0ZDktYmVmZS0yNGMxZDhiMWJlM2Y",
    meta: { count: 2 },
    _mock: true,
  },
  odds: {
    success: true,
    data: [
      {
        id: "b9445260-2841-4c38-9b8d-0598229ca565:ballybet:SPREAD:019f40db-e347-7a25-abc4",
        sportsbook: "ballybet",
        competition: "wnba",
        eventId: "b9445260-2841-4c38-9b8d-0598229ca565",
        market: "SPREAD",
        marketSubtype: "SPREAD",
        period: "FULL",
        selection: "Atlanta Dream",
        priceAmerican: 190,
        priceDecimal: 2.9,
        line: -16.5,
        outcomeCode: "WIN",
        side: 1,
        outcomeParticipants: [{ kind: "competitor", name: "Atlanta Dream" }],
        suspended: false,
        eventStartTime: "2026-07-10T00:00",
        updated: "2026-07-09T16:58:04Z",
      },
      // A SEASON-scope future. `marketScope` and `segment` appear ONLY on
      // non-EVENT rows (game rows above omit both entirely). All 32 NFL
      // DIVISION_WINNER selections share this one season-anchor eventId, so
      // `segment` is what separates the 8 division races; `eventStartTime` is
      // the season anchor / settlement date, not a kickoff. Categorical
      // market: one YES selection per competitor, no `side`, no NO side.
      {
        id: "b2e737f7-dfb6-4535-bdc4-852ce6b8d255:betonline:DIVISION_WINNER:01a01e15-a58c-7092-8a5b",
        sportsbook: "betonline",
        competition: "nfl",
        eventId: "b2e737f7-dfb6-4535-bdc4-852ce6b8d255",
        market: "CATEGORICAL",
        marketSubtype: "DIVISION_WINNER",
        period: "REG_SEASON",
        selection: "Buffalo Bills",
        priceAmerican: -180,
        priceDecimal: 1.56,
        outcomeCode: "YES",
        outcomeParticipants: [{ kind: "competitor", name: "Buffalo Bills" }],
        suspended: false,
        eventStartTime: "2027-01-10T18:00",
        updated: "2026-08-20T16:33:20Z",
        marketScope: "SEASON",
        segment: "AFC_EAST",
      },
      // A TOURNAMENT-scope outright (golf/tennis) — a different product from
      // season futures; scope=season does NOT return these.
      {
        id: "00063747-5880-422e-8552-149dc68805ae:betmgm:TOURNAMENT_WINNER:019fec53-c223-794f",
        sportsbook: "betmgm",
        competition: "pga-tour",
        eventId: "00063747-5880-422e-8552-149dc68805ae",
        market: "CATEGORICAL",
        marketSubtype: "TOURNAMENT_WINNER",
        period: "FULL",
        selection: "Xander Schauffele",
        priceAmerican: 1400,
        priceDecimal: 15.0,
        outcomeCode: "WIN",
        playerName: "Xander Schauffele",
        outcomeParticipants: [{ kind: "player", name: "Xander Schauffele" }],
        suspended: false,
        eventStartTime: "2026-08-30T21:00",
        updated: "2026-08-13T11:05:43Z",
        marketScope: "TOURNAMENT",
      },
    ],
    nextCursor: null,
    meta: { count: 3 },
    _mock: true,
  },
  edges: {
    success: true,
    data: [
      {
        id: "04618737-...|PLAYER_TOTAL_TOTAL_BASES|FULL|0.5|pid:7ebca4f0-...|OVER",
        competition: "mlb",
        eventId: "04618737-e571-44d9-befe-24c1d8b1be3f",
        participants: [
          { side: 1, sideLabel: "home", position: 1, name: "Tampa Bay Rays" },
          { side: 2, sideLabel: "away", position: 1, name: "New York Yankees" },
        ],
        eventStartTime: "2026-07-09T17:10Z",
        market: "PLAYER_TOTAL_TOTAL_BASES",
        statType: "total_bases",
        period: "FULL",
        line: 0.5,
        outcomeCode: "OVER",
        playerName: "Ben Rice",
        playerTeamName: "New York Yankees",
        dfsSource: "chalkboard",
        dfsMultiplier: 1.78,
        dfsSelectionLabel: "Ben Rice Total Bases Over 0.5",
        bookSource: "thescore",
        bookImpliedProbability: 60.67,
        oddsByBook: [
          { source: "thescore", over: -180, under: 140, impliedProb: 60.67, lastSeen: "2026-07-09T16:57:07Z" },
        ],
      },
    ],
    nextCursor: null,
    meta: { count: 1 },
    _mock: true,
  },
  arbitrage: {
    success: true,
    data: [
      {
        id: "f1e05c22-...|MONEYLINE_3WAY|FULL|REG|ML",
        type: "three_way",
        profitPercent: 4.49,
        competition: "fifa-world-cup",
        eventId: "f1e05c22-e63a-4d73-8a4b-caafcfc2e546",
        participants: [
          { side: 1, sideLabel: "home", position: 1, name: "France" },
          { side: 2, sideLabel: "away", position: 1, name: "Morocco" },
        ],
        eventStartTime: "2026-07-09T20:00Z",
        lastSeen: "2026-07-09T16:58:31Z",
        selections: [
          { source: "thescore", marketType: "MONEYLINE_3WAY", period: "FULL", outcomeCode: "WIN", side: 1, selectionLabel: "France", odds: 700, stakeFraction: 0.2747 },
          { source: "betmgm", marketType: "MONEYLINE_3WAY", period: "FULL", outcomeCode: "WIN", side: 2, selectionLabel: "Morocco", odds: 1200, stakeFraction: 0.169 },
          { source: "draftkings", marketType: "MONEYLINE_3WAY", period: "FULL", outcomeCode: "DRAW", selectionLabel: "Draw", odds: 260, stakeFraction: 0.5563 },
        ],
      },
    ],
    nextCursor: null,
    meta: { count: 1 },
    _mock: true,
  },
  players: {
    success: true,
    data: [
      {
        id: "7ebca4f0-138a-11f1-aba1-de512ebea802",
        name: "Ben Rice",
        competition: "mlb",
        competitorId: "7d0a7fdb-138a-11f1-aba1-de512ebea802",
        position: "1B",
      },
    ],
    nextCursor: null,
    meta: { count: 1 },
    _mock: true,
  },
  competitors: {
    success: true,
    data: [
      {
        id: "7d0a80b1-138a-11f1-aba1-de512ebea802",
        name: "Tampa Bay Rays",
        abbreviation: "TB",
        competition: "mlb",
      },
    ],
    nextCursor: null,
    meta: { count: 1 },
    _mock: true,
  },
  event_detail: {
    success: true,
    data: [
      {
        id: "6968414b-57e4-4761-ba2b-f80a254e008e",
        startTime: "2026-07-09T02:10:00Z",
        status: "final",
        competition: "mlb",
        hasOdds: false,
        venueId: "71a0f05b-525b-41c0-81a6-64b64c48832b",
        seasonYear: 2026,
        participants: [
          { side: 1, sideLabel: "home", position: 1, name: "Tampa Bay Rays", score: 4 },
          { side: 2, sideLabel: "away", position: 1, name: "New York Yankees", score: 3 },
        ],
        state: { status: "final", source: "caesars", observedAt: "2026-07-09T05:01:44Z" },
        context: {
          weather: { condition: "Clear", temp_f: 78, wind_mph: 9, wind_dir: "Out To CF" },
          probable_pitchers: { home: "Shane Baz", away: "Carlos Rodón" },
          lineups_confirmed: true,
          officials: [{ position: "HP", name: "Pat Hoberg" }],
        },
      },
    ],
    meta: { count: 1 },
    _mock: true,
  },
  event_stats: {
    success: true,
    data: [
      {
        eventId: "6968414b-57e4-4761-ba2b-f80a254e008e",
        competitors: [
          {
            eventId: "6968414b-57e4-4761-ba2b-f80a254e008e",
            side1Id: "7d0a80b1-138a-11f1-aba1-de512ebea802",
            side2Id: "7d0a7fdb-138a-11f1-aba1-de512ebea802",
            competition: "mlb",
            side1Score: 4,
            side2Score: 3,
            result: 1,
            stats: null,
          },
        ],
        players: [
          {
            eventId: "6968414b-57e4-4761-ba2b-f80a254e008e",
            playerId: "7ebca4f0-138a-11f1-aba1-de512ebea802",
            competitorId: "7d0a7fdb-138a-11f1-aba1-de512ebea802",
            date: "2026-07-09T02:10:00Z",
            data: {
              batting_stats: { ab: 4, h: 2, hr: 1, rbi: 2, bb: 0, so: 1 },
            },
          },
        ],
      },
    ],
    meta: { count: 1 },
    _mock: true,
  },
  competitor_stats: {
    success: true,
    data: [
      {
        eventId: "6968414b-57e4-4761-ba2b-f80a254e008e",
        side1Id: "7d0a80b1-138a-11f1-aba1-de512ebea802",
        side2Id: "7d0a7fdb-138a-11f1-aba1-de512ebea802",
        competition: "mlb",
        side1Score: 4,
        side2Score: 3,
        result: 1,
        stats: null,
      },
    ],
    meta: { count: 1 },
    _mock: true,
  },
  player_game_logs: {
    success: true,
    data: [
      {
        eventId: "6968414b-57e4-4761-ba2b-f80a254e008e",
        playerId: "7ebca4f0-138a-11f1-aba1-de512ebea802",
        competitorId: "7d0a7fdb-138a-11f1-aba1-de512ebea802",
        date: "2026-07-09T02:10:00Z",
        data: {
          batting_stats: { ab: 4, h: 2, hr: 1, rbi: 2, bb: 0, so: 1 },
        },
      },
    ],
    nextCursor: null,
    meta: { count: 1 },
    _mock: true,
  },
  usage: {
    success: true,
    data: [
      {
        plan: "archmage",
        rateLimitPerMin: 60,
        authenticated: false,
        note: "No API key supplied; showing the effective anonymous plan (pre-billing, unmetered).",
      },
    ],
    meta: { count: 1 },
    _mock: true,
  },
  player_stats: {
    success: true,
    data: [
      {
        playerId: "7ebca4f0-138a-11f1-aba1-de512ebea802",
        playerName: "Ben Rice",
        season: 2026,
        competition: "mlb",
        stats: { games: 88, hits: 92, homeRuns: 19, rbi: 55, avg: 0.264 },
      },
    ],
    meta: { count: 1 },
    _mock: true,
  },
};

export function mockFor(mockKey: string): any {
  return (
    MOCK[mockKey] ?? {
      success: true,
      data: [],
      meta: { count: 0 },
      _mock: true,
      _note: `No mock fixture for '${mockKey}'.`,
    }
  );
}
