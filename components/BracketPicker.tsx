"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BracketState,
  GameId,
  emptyState,
  resolve,
  setPick,
} from "@/lib/bracket";
import { decodeState, encodeState } from "@/lib/encode";
import { team as getTeam } from "@/lib/teams";
import MatchupCard from "./MatchupCard";
import ShareBar from "./ShareBar";
import TeamBadge from "./TeamBadge";

interface Props {
  initialCode?: string;
}

const ROUND_SECTIONS = [
  { id: "play-in", label: "Play-In" },
  { id: "r1", label: "1st Round" },
  { id: "r2", label: "Semis" },
  { id: "r3", label: "Conf. Finals" },
  { id: "f", label: "Finals" },
  { id: "mvp", label: "MVP" },
];

export default function BracketPicker({ initialCode }: Props) {
  const [state, setState] = useState<BracketState>(() =>
    initialCode ? decodeState(initialCode) : emptyState(),
  );
  const [activeSection, setActiveSection] = useState("play-in");

  // Keep URL in sync with bracket state (replaceState so history isn't spammed).
  // The code is already URL-safe (game IDs are ASCII, MVP is encodeURIComponent'd
  // inside encodeState), so we do NOT re-encode it here — that would cause a
  // double-encode/decode dance that's fragile.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const code = encodeState(state);
    const hasAny = Object.keys(state.picks).length > 0 || state.mvp.length > 0;
    const url = hasAny ? `/b/${code}` : "/";
    if (window.location.pathname + (window.location.search || "") !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [state]);

  const resolved = useMemo(() => resolve(state), [state]);

  const pick = useCallback((gameId: GameId, teamId: string) => {
    setState((s) => {
      // Tap same team to unset
      const current = s.picks[gameId];
      return setPick(s, gameId, current === teamId ? undefined : teamId);
    });
  }, []);

  const reset = useCallback(() => {
    if (confirm("Reset the whole bracket?")) setState(emptyState());
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`section-${id}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Compute progress for round nav
  const progress = useMemo(() => {
    const done = (ids: string[]) => ids.filter((id) => state.picks[id as GameId]).length;
    return {
      "play-in": { done: done(["pWA", "pWB", "pWC", "pEA", "pEB", "pEC"]), total: 6 },
      r1: { done: done(["r1W0", "r1W1", "r1W2", "r1W3", "r1E0", "r1E1", "r1E2", "r1E3"]), total: 8 },
      r2: { done: done(["r2W0", "r2W1", "r2E0", "r2E1"]), total: 4 },
      r3: { done: done(["r3W", "r3E"]), total: 2 },
      f: { done: done(["f"]), total: 1 },
      mvp: { done: state.mvp ? 1 : 0, total: 1 },
    } as Record<string, { done: number; total: number }>;
  }, [state]);

  const code = encodeState(state);

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="pt-safe px-4 pt-4 pb-3 max-w-3xl mx-auto">
        <h1 className="font-serif text-[28px] leading-[1.1] sm:text-4xl font-bold tracking-tight">
          2025-26 NBA Playoffs Bracket
        </h1>
        <p className="mt-1 text-sm text-[#6b6b6b]">
          Tap teams to advance them. Play-in picks unlock the 7 and 8 seeds.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="h-9 px-3.5 rounded-full bg-white border border-[#e6e3d8] text-sm font-medium hover:bg-[#f0ede2] active:scale-[0.98]"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Sticky round nav */}
      <nav className="sticky top-0 z-20 bg-paper/95 backdrop-blur border-y border-[#e6e3d8]">
        <div className="max-w-3xl mx-auto">
          <div className="round-nav flex gap-1 px-3 py-2 overflow-x-auto">
            {ROUND_SECTIONS.map((s) => {
              const p = progress[s.id];
              const active = activeSection === s.id;
              const complete = p.done === p.total;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className={`flex-shrink-0 h-9 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? "bg-ink text-white"
                      : "bg-white border border-[#e6e3d8] text-[#444] hover:bg-[#f0ede2]"
                  }`}
                >
                  {s.label}
                  <span
                    className={`ml-1.5 tabular-nums ${
                      active ? "opacity-70" : complete ? "text-[#007a33]" : "opacity-60"
                    }`}
                  >
                    {p.done}/{p.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-4 pb-40 space-y-8">
        {/* Play-In Section */}
        <section id="section-play-in" className="scroll-mt-24">
          <SectionHeader label="Play-In Tournament" />

          <div className="mt-3 space-y-5">
            <ConferencePlayIn
              title="West Play-In"
              games={resolved.playIn.west}
              state={state}
              onPick={pick}
            />
            <ConferencePlayIn
              title="East Play-In"
              games={resolved.playIn.east}
              state={state}
              onPick={pick}
            />
          </div>
        </section>

        {/* First Round */}
        <section id="section-r1" className="scroll-mt-24">
          <SectionHeader label="First Round" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {resolved.r1.west.map((m) => (
              <MatchupCard
                key={m.id}
                matchup={m}
                pick={state.picks[m.id]}
                onPick={(tid) => pick(m.id, tid)}
                labelOverride="West — First Round"
              />
            ))}
            {resolved.r1.east.map((m) => (
              <MatchupCard
                key={m.id}
                matchup={m}
                pick={state.picks[m.id]}
                onPick={(tid) => pick(m.id, tid)}
                labelOverride="East — First Round"
              />
            ))}
          </div>
        </section>

        {/* Conf Semis */}
        <section id="section-r2" className="scroll-mt-24">
          <SectionHeader label="Conference Semifinals" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {resolved.r2.west.map((m) => (
              <MatchupCard
                key={m.id}
                matchup={m}
                pick={state.picks[m.id]}
                onPick={(tid) => pick(m.id, tid)}
                labelOverride="West Semis"
              />
            ))}
            {resolved.r2.east.map((m) => (
              <MatchupCard
                key={m.id}
                matchup={m}
                pick={state.picks[m.id]}
                onPick={(tid) => pick(m.id, tid)}
                labelOverride="East Semis"
              />
            ))}
          </div>
        </section>

        {/* Conf Finals */}
        <section id="section-r3" className="scroll-mt-24">
          <SectionHeader label="Conference Finals" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MatchupCard
              matchup={resolved.r3.west}
              pick={state.picks.r3W}
              onPick={(tid) => pick("r3W", tid)}
              labelOverride="West Finals"
            />
            <MatchupCard
              matchup={resolved.r3.east}
              pick={state.picks.r3E}
              onPick={(tid) => pick("r3E", tid)}
              labelOverride="East Finals"
            />
          </div>
        </section>

        {/* Finals */}
        <section id="section-f" className="scroll-mt-24">
          <SectionHeader label="NBA Finals" />
          <div className="mt-3">
            <MatchupCard
              matchup={resolved.finals}
              pick={state.picks.f}
              onPick={(tid) => pick("f", tid)}
              labelOverride="2026 NBA Finals"
            />
          </div>

          {resolved.champion && (
            <div className="mt-4 rounded-xl border-2 border-[#e6e3d8] bg-white p-4 flex items-center gap-3">
              <TeamBadge teamId={resolved.champion} size={44} />
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[#6b6b6b] font-semibold">
                  2026 NBA Champions
                </div>
                <div className="font-serif text-xl font-bold">
                  {getTeam(resolved.champion).name}
                </div>
              </div>
              <div className="ml-auto text-2xl">🏆</div>
            </div>
          )}
        </section>

        {/* MVP */}
        <section id="section-mvp" className="scroll-mt-24">
          <SectionHeader label="Finals MVP" />
          <div className="mt-3">
            <input
              type="text"
              value={state.mvp}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  // Strip the delimiter char so it can't corrupt the URL code.
                  mvp: e.target.value.replace(/~/g, ""),
                }))
              }
              placeholder="Who wins Finals MVP?"
              className="w-full h-12 px-4 rounded-xl bg-white border border-[#e6e3d8] text-base focus:outline-none focus:border-ink"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={40}
            />
          </div>
        </section>
      </main>

      {/* Sticky share bar */}
      <ShareBar code={code} hasPicks={Object.keys(state.picks).length > 0 || !!state.mvp} />
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h2 className="text-xs font-bold tracking-[0.12em] uppercase text-[#6b6b6b]">
      {label}
    </h2>
  );
}

function ConferencePlayIn({
  title,
  games,
  state,
  onPick,
}: {
  title: string;
  games: { gameA: import("@/lib/bracket").Matchup; gameB: import("@/lib/bracket").Matchup; gameC: import("@/lib/bracket").Matchup };
  state: BracketState;
  onPick: (g: GameId, t: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink/80">
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <MatchupCard
          matchup={games.gameA}
          pick={state.picks[games.gameA.id]}
          onPick={(t) => onPick(games.gameA.id, t)}
        />
        <MatchupCard
          matchup={games.gameB}
          pick={state.picks[games.gameB.id]}
          onPick={(t) => onPick(games.gameB.id, t)}
        />
        <MatchupCard
          matchup={games.gameC}
          pick={state.picks[games.gameC.id]}
          onPick={(t) => onPick(games.gameC.id, t)}
        />
      </div>
    </div>
  );
}
