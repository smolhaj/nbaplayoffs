// 2025-26 NBA Playoffs seeding (hardcoded per the screenshot reference).
// Update these once real standings lock in.

export type Conference = "W" | "E";

export interface Team {
  id: string; // 3-letter abbrev, stable
  name: string;
  shortName: string; // for tight spaces
  city: string;
  conference: Conference;
  primary: string; // hex
  secondary: string; // hex
  text: "light" | "dark"; // which text color to use on primary
}

export const TEAMS: Record<string, Team> = {
  // Western Conference
  OKC: { id: "OKC", name: "Oklahoma City Thunder", shortName: "Thunder", city: "OKC", conference: "W", primary: "#007ac1", secondary: "#ef3b24", text: "light" },
  LAL: { id: "LAL", name: "Los Angeles Lakers", shortName: "Lakers", city: "LAL", conference: "W", primary: "#552583", secondary: "#fdb927", text: "light" },
  HOU: { id: "HOU", name: "Houston Rockets", shortName: "Rockets", city: "HOU", conference: "W", primary: "#ce1141", secondary: "#000000", text: "light" },
  DEN: { id: "DEN", name: "Denver Nuggets", shortName: "Nuggets", city: "DEN", conference: "W", primary: "#0e2240", secondary: "#fec524", text: "light" },
  MIN: { id: "MIN", name: "Minnesota Timberwolves", shortName: "Wolves", city: "MIN", conference: "W", primary: "#0c2340", secondary: "#78be20", text: "light" },
  SAS: { id: "SAS", name: "San Antonio Spurs", shortName: "Spurs", city: "SAS", conference: "W", primary: "#c4ced4", secondary: "#000000", text: "dark" },
  PHX: { id: "PHX", name: "Phoenix Suns", shortName: "Suns", city: "PHX", conference: "W", primary: "#1d1160", secondary: "#e56020", text: "light" },
  POR: { id: "POR", name: "Portland Trail Blazers", shortName: "Blazers", city: "POR", conference: "W", primary: "#e03a3e", secondary: "#000000", text: "light" },
  LAC: { id: "LAC", name: "LA Clippers", shortName: "Clippers", city: "LAC", conference: "W", primary: "#c8102e", secondary: "#1d428a", text: "light" },
  GSW: { id: "GSW", name: "Golden State Warriors", shortName: "Warriors", city: "GSW", conference: "W", primary: "#1d428a", secondary: "#ffc72c", text: "light" },

  // Eastern Conference
  DET: { id: "DET", name: "Detroit Pistons", shortName: "Pistons", city: "DET", conference: "E", primary: "#c8102e", secondary: "#1d42ba", text: "light" },
  CLE: { id: "CLE", name: "Cleveland Cavaliers", shortName: "Cavaliers", city: "CLE", conference: "E", primary: "#860038", secondary: "#fdbb30", text: "light" },
  NYK: { id: "NYK", name: "New York Knicks", shortName: "Knicks", city: "NYK", conference: "E", primary: "#006bb6", secondary: "#f58426", text: "light" },
  BOS: { id: "BOS", name: "Boston Celtics", shortName: "Celtics", city: "BOS", conference: "E", primary: "#007a33", secondary: "#ba9653", text: "light" },
  TOR: { id: "TOR", name: "Toronto Raptors", shortName: "Raptors", city: "TOR", conference: "E", primary: "#ce1141", secondary: "#000000", text: "light" },
  ATL: { id: "ATL", name: "Atlanta Hawks", shortName: "Hawks", city: "ATL", conference: "E", primary: "#e03a3e", secondary: "#c1d32f", text: "light" },
  PHI: { id: "PHI", name: "Philadelphia 76ers", shortName: "76ers", city: "PHI", conference: "E", primary: "#006bb6", secondary: "#ed174c", text: "light" },
  CHA: { id: "CHA", name: "Charlotte Hornets", shortName: "Hornets", city: "CHA", conference: "E", primary: "#1d1160", secondary: "#00788c", text: "light" },
  ORL: { id: "ORL", name: "Orlando Magic", shortName: "Magic", city: "ORL", conference: "E", primary: "#0077c0", secondary: "#c4ced4", text: "light" },
  MIA: { id: "MIA", name: "Miami Heat", shortName: "Heat", city: "MIA", conference: "E", primary: "#98002e", secondary: "#f9a01b", text: "light" },
};

// Hardcoded seeding per screenshot reference:
// West: 1 OKC, 2 SAS, 3 DEN, 4 LAL, 5 HOU, 6 MIN, (7/8 from play-in: PHX, POR),
//       (9/10: LAC, GSW)
// East: 1 DET, 2 BOS, 3 NYK, 4 CLE, 5 TOR, 6 ATL, (7/8 from play-in: PHI, ORL),
//       (9/10: CHA, MIA)

export interface Seeding {
  // Seeds 1-6 are locked.
  s1: string; s2: string; s3: string; s4: string; s5: string; s6: string;
  // Play-in pool: seeds 7, 8, 9, 10
  s7: string; s8: string; s9: string; s10: string;
}

export const WEST_SEEDS: Seeding = {
  s1: "OKC", s2: "SAS", s3: "DEN", s4: "LAL", s5: "HOU", s6: "MIN",
  s7: "PHX", s8: "POR", s9: "LAC", s10: "GSW",
};

export const EAST_SEEDS: Seeding = {
  s1: "DET", s2: "BOS", s3: "NYK", s4: "CLE", s5: "TOR", s6: "ATL",
  s7: "PHI", s8: "ORL", s9: "CHA", s10: "MIA",
};

export function getSeeding(conf: Conference): Seeding {
  return conf === "W" ? WEST_SEEDS : EAST_SEEDS;
}

export function team(id: string): Team {
  const t = TEAMS[id];
  if (!t) throw new Error(`Unknown team: ${id}`);
  return t;
}
