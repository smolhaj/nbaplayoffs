// Compact URL state codec.
// Each game stores the team abbreviation (3 chars) or "_" for empty.
// Picks in fixed game-id order are joined by "."; MVP text is URL-encoded
// and appended after a "~".
//
// Example shape (play-in filled, rest empty):
//   PHX.LAC.LAC.PHI.CHA.CHA._._._._._._._._._._._._._._~Jokic
//
// Length is bounded and short enough for iMessage / SMS previews.

import { ALL_GAME_IDS, BracketState, GameId, emptyState } from "./bracket";
import { TEAMS } from "./teams";

const SEP = ".";
const MVP_PREFIX = "~";
const EMPTY = "_";

export function encodeState(state: BracketState): string {
  const parts: string[] = ALL_GAME_IDS.map((id) => {
    const pick = state.picks[id];
    return pick ? pick : EMPTY;
  });

  const base = parts.join(SEP);
  if (!state.mvp) return base;
  return `${base}${MVP_PREFIX}${encodeURIComponent(state.mvp)}`;
}

export function decodeState(code: string | undefined | null): BracketState {
  if (!code) return emptyState();

  let picksSection = code;
  let mvp = "";
  const mvpIdx = code.indexOf(MVP_PREFIX);
  if (mvpIdx !== -1) {
    picksSection = code.slice(0, mvpIdx);
    const raw = code.slice(mvpIdx + 1);
    try {
      mvp = decodeURIComponent(raw);
    } catch {
      // Malformed percent sequence → treat as literal rather than losing data.
      mvp = raw;
    }
  }

  const parts = picksSection.split(SEP);
  const picks: Partial<Record<GameId, string>> = {};
  for (let i = 0; i < ALL_GAME_IDS.length && i < parts.length; i++) {
    const val = parts[i];
    if (val && val !== EMPTY && TEAMS[val]) {
      picks[ALL_GAME_IDS[i]] = val;
    }
  }

  return { picks, mvp };
}
