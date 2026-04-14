import { Conference, getSeeding } from "./teams";

// Identifiers for every game in the bracket.
// Play-in: pWA, pWB, pWC (West), pEA, pEB, pEC (East)
// First round: r1W0..r1W3, r1E0..r1E3 (4 per conference)
// Semis: r2W0..r2W1, r2E0..r2E1
// Conf finals: r3W, r3E
// Finals: f
// MVP: free-text separate field

export type GameId =
  | "pWA" | "pWB" | "pWC"
  | "pEA" | "pEB" | "pEC"
  | "r1W0" | "r1W1" | "r1W2" | "r1W3"
  | "r1E0" | "r1E1" | "r1E2" | "r1E3"
  | "r2W0" | "r2W1" | "r2E0" | "r2E1"
  | "r3W" | "r3E"
  | "f";

export const ALL_GAME_IDS: GameId[] = [
  "pWA", "pWB", "pWC",
  "pEA", "pEB", "pEC",
  "r1W0", "r1W1", "r1W2", "r1W3",
  "r1E0", "r1E1", "r1E2", "r1E3",
  "r2W0", "r2W1", "r2E0", "r2E1",
  "r3W", "r3E",
  "f",
];

export interface BracketState {
  picks: Partial<Record<GameId, string>>; // gameId -> team id
  mvp: string;
}

export function emptyState(): BracketState {
  return { picks: {}, mvp: "" };
}

// ---------------------------------------------------------------------------
// Matchup resolution: given a partial state, compute who is playing in each
// game. Any game whose participants aren't yet known returns undefined slots.
// ---------------------------------------------------------------------------

export interface Matchup {
  id: GameId;
  round: "play-in" | "r1" | "r2" | "r3" | "f";
  label: string;
  sub?: string;
  conference?: Conference;
  // "seed" is the playoff seed (1-8) or play-in label; used for badges
  home?: { teamId: string; seed: number | string };
  away?: { teamId: string; seed: number | string };
  locked?: boolean; // true if participants not yet known
}

function playInFor(conf: Conference, state: BracketState) {
  const seeds = getSeeding(conf);
  const prefix = conf === "W" ? "pW" : "pE";
  const gA = (prefix + "A") as GameId;
  const gB = (prefix + "B") as GameId;
  const gC = (prefix + "C") as GameId;

  const gameA: Matchup = {
    id: gA,
    round: "play-in",
    label: "Game A — 7 seed vs 8 seed",
    sub: "Winner = 7 seed",
    conference: conf,
    home: { teamId: seeds.s7, seed: 7 },
    away: { teamId: seeds.s8, seed: 8 },
  };
  const gameB: Matchup = {
    id: gB,
    round: "play-in",
    label: "Game B — 9 seed vs 10 seed",
    sub: "Winner advances to Game C",
    conference: conf,
    home: { teamId: seeds.s9, seed: 9 },
    away: { teamId: seeds.s10, seed: 10 },
  };

  // Game C: Loser of A vs Winner of B, winner = 8 seed.
  const winnerA = state.picks[gA];
  const loserA = winnerA
    ? (winnerA === seeds.s7 ? seeds.s8 : seeds.s7)
    : undefined;
  const winnerB = state.picks[gB];
  const gameC: Matchup = {
    id: gC,
    round: "play-in",
    label: "Game C — Loser A vs Winner B",
    sub: "Winner = 8 seed",
    conference: conf,
    home: loserA ? { teamId: loserA, seed: "L-A" } : undefined,
    away: winnerB ? { teamId: winnerB, seed: "W-B" } : undefined,
    locked: !loserA || !winnerB,
  };

  return { gameA, gameB, gameC };
}

// Resolve the 7 and 8 seeds for a conference given play-in picks.
// Returns undefined for missing picks.
function resolvedSeed7(conf: Conference, state: BracketState): string | undefined {
  const seeds = getSeeding(conf);
  const prefix = conf === "W" ? "pW" : "pE";
  return state.picks[(prefix + "A") as GameId] as string | undefined;
}

function resolvedSeed8(conf: Conference, state: BracketState): string | undefined {
  const prefix = conf === "W" ? "pW" : "pE";
  return state.picks[(prefix + "C") as GameId] as string | undefined;
}

// First round uses 1v8, 4v5, 3v6, 2v7
function round1For(conf: Conference, state: BracketState): Matchup[] {
  const seeds = getSeeding(conf);
  const s7 = resolvedSeed7(conf, state);
  const s8 = resolvedSeed8(conf, state);
  const prefix = conf === "W" ? "r1W" : "r1E";

  const pairs: Array<[string | undefined, number, string | undefined, number]> = [
    [seeds.s1, 1, s8, 8],
    [seeds.s4, 4, seeds.s5, 5],
    [seeds.s3, 3, seeds.s6, 6],
    [seeds.s2, 2, s7, 7],
  ];

  return pairs.map(([a, aSeed, b, bSeed], i) => {
    const id = (prefix + i) as GameId;
    return {
      id,
      round: "r1",
      label: "First Round",
      conference: conf,
      home: a ? { teamId: a, seed: aSeed } : undefined,
      away: b ? { teamId: b, seed: bSeed } : undefined,
      locked: !a || !b,
    };
  });
}

function round2For(conf: Conference, state: BracketState): Matchup[] {
  const prefix = conf === "W" ? "r2W" : "r2E";
  const r1Prefix = conf === "W" ? "r1W" : "r1E";
  const r1 = round1For(conf, state);

  // r2-0: winner(r1-0) vs winner(r1-1)  (1/8 vs 4/5)
  // r2-1: winner(r1-2) vs winner(r1-3)  (3/6 vs 2/7)
  const pairs: Array<[Matchup, Matchup]> = [
    [r1[0], r1[1]],
    [r1[2], r1[3]],
  ];

  return pairs.map(([m1, m2], i) => {
    const w1 = state.picks[m1.id];
    const w2 = state.picks[m2.id];
    const seed1 = w1 ? seedOfTeamInMatchup(m1, w1) : undefined;
    const seed2 = w2 ? seedOfTeamInMatchup(m2, w2) : undefined;
    return {
      id: (prefix + i) as GameId,
      round: "r2",
      label: "Conf. Semis",
      conference: conf,
      home: w1 && seed1 !== undefined ? { teamId: w1, seed: seed1 } : undefined,
      away: w2 && seed2 !== undefined ? { teamId: w2, seed: seed2 } : undefined,
      locked: !w1 || !w2,
    };
  });
}

function confFinalsFor(conf: Conference, state: BracketState): Matchup {
  const id = (conf === "W" ? "r3W" : "r3E") as GameId;
  const r2 = round2For(conf, state);
  const w1 = state.picks[r2[0].id];
  const w2 = state.picks[r2[1].id];
  const seed1 = w1 ? seedOfTeamInMatchup(r2[0], w1) : undefined;
  const seed2 = w2 ? seedOfTeamInMatchup(r2[1], w2) : undefined;
  return {
    id,
    round: "r3",
    label: "Conf. Finals",
    conference: conf,
    home: w1 && seed1 !== undefined ? { teamId: w1, seed: seed1 } : undefined,
    away: w2 && seed2 !== undefined ? { teamId: w2, seed: seed2 } : undefined,
    locked: !w1 || !w2,
  };
}

function finals(state: BracketState): Matchup {
  const west = confFinalsFor("W", state);
  const east = confFinalsFor("E", state);
  const wW = state.picks[west.id];
  const wE = state.picks[east.id];
  const seedW = wW ? seedOfTeamInMatchup(west, wW) : undefined;
  const seedE = wE ? seedOfTeamInMatchup(east, wE) : undefined;
  return {
    id: "f",
    round: "f",
    label: "NBA Finals",
    home: wW && seedW !== undefined ? { teamId: wW, seed: seedW } : undefined,
    away: wE && seedE !== undefined ? { teamId: wE, seed: seedE } : undefined,
    locked: !wW || !wE,
  };
}

function seedOfTeamInMatchup(m: Matchup, teamId: string): number | string | undefined {
  if (m.home?.teamId === teamId) return m.home.seed;
  if (m.away?.teamId === teamId) return m.away.seed;
  return undefined;
}

// Full resolved bracket structure for rendering.
export interface ResolvedBracket {
  playIn: {
    west: { gameA: Matchup; gameB: Matchup; gameC: Matchup };
    east: { gameA: Matchup; gameB: Matchup; gameC: Matchup };
  };
  r1: { west: Matchup[]; east: Matchup[] };
  r2: { west: Matchup[]; east: Matchup[] };
  r3: { west: Matchup; east: Matchup };
  finals: Matchup;
  champion: string | undefined;
  mvp: string;
  isPlayInComplete: boolean;
}

export function resolve(state: BracketState): ResolvedBracket {
  const west = playInFor("W", state);
  const east = playInFor("E", state);
  const isPlayInComplete =
    !!state.picks.pWA && !!state.picks.pWB && !!state.picks.pWC &&
    !!state.picks.pEA && !!state.picks.pEB && !!state.picks.pEC;

  const r1 = { west: round1For("W", state), east: round1For("E", state) };
  const r2 = { west: round2For("W", state), east: round2For("E", state) };
  const r3 = { west: confFinalsFor("W", state), east: confFinalsFor("E", state) };
  const f = finals(state);
  const champion = state.picks.f;

  return {
    playIn: { west, east },
    r1,
    r2,
    r3,
    finals: f,
    champion,
    mvp: state.mvp,
    isPlayInComplete,
  };
}

// ---------------------------------------------------------------------------
// Pick + cascade invalidation
// If a user changes a pick, any downstream games that reference the now-removed
// team must be cleared. This also handles Game A: changing the winner changes
// who the "loser" is, which changes Game C's matchup, so we clear Game C.
// ---------------------------------------------------------------------------

export function setPick(
  state: BracketState,
  gameId: GameId,
  teamId: string | undefined,
): BracketState {
  const picks = { ...state.picks };

  // If unchanged, no-op.
  if (picks[gameId] === teamId) return state;

  if (teamId === undefined) {
    delete picks[gameId];
  } else {
    picks[gameId] = teamId;
  }

  // Propagate invalidation. Keep iterating until a fixed point.
  let next: BracketState = { ...state, picks };
  let changed = true;
  while (changed) {
    changed = false;
    const resolved = resolve(next);
    const allMatchups: Matchup[] = [
      resolved.playIn.west.gameA, resolved.playIn.west.gameB, resolved.playIn.west.gameC,
      resolved.playIn.east.gameA, resolved.playIn.east.gameB, resolved.playIn.east.gameC,
      ...resolved.r1.west, ...resolved.r1.east,
      ...resolved.r2.west, ...resolved.r2.east,
      resolved.r3.west, resolved.r3.east,
      resolved.finals,
    ];
    const nextPicks = { ...next.picks };
    for (const m of allMatchups) {
      const w = nextPicks[m.id];
      if (!w) continue;
      // If locked (participants unknown) or winner isn't one of current participants, clear.
      const validTeams = [m.home?.teamId, m.away?.teamId].filter(Boolean) as string[];
      if (m.locked || !validTeams.includes(w)) {
        delete nextPicks[m.id];
        changed = true;
      }
    }
    if (changed) {
      next = { ...next, picks: nextPicks };
    }
  }

  return next;
}

export function resetState(): BracketState {
  return emptyState();
}
