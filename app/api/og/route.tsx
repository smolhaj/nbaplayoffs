import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { decodeState } from "@/lib/encode";
import { Matchup, resolve } from "@/lib/bracket";
import { team as getTeam } from "@/lib/teams";

export const runtime = "edge";

// Cache: deterministic per code, safe to cache forever.
const CACHE_HEADERS = "public, max-age=31536000, immutable";

const WIDTH = 1200;
const HEIGHT = 1260;

const PAPER = "#f7f5ef";
const INK = "#111111";
const MUTED = "#6b6b6b";
const BORDER = "#e6e3d8";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const download = url.searchParams.get("download") === "1";

  const state = decodeState(code);
  const resolved = resolve(state);

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: PAPER,
          display: "flex",
          flexDirection: "column",
          padding: 48,
          fontFamily: "sans-serif",
          color: INK,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              fontFamily: "serif",
            }}
          >
            2025-26 NBA Playoffs Bracket
          </div>
          <div style={{ fontSize: 20, color: MUTED, marginTop: 8 }}>
            nba-26-pickem.vercel.app
          </div>
        </div>

        {/* Play-in row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
          <PlayInColumn
            title="WEST PLAY-IN"
            gameA={resolved.playIn.west.gameA}
            gameB={resolved.playIn.west.gameB}
            gameC={resolved.playIn.west.gameC}
            picks={state.picks}
          />
          <PlayInColumn
            title="EAST PLAY-IN"
            gameA={resolved.playIn.east.gameA}
            gameB={resolved.playIn.east.gameB}
            gameC={resolved.playIn.east.gameC}
            picks={state.picks}
          />
        </div>

        {/* Divider */}
        <div style={{ display: "flex", height: 1, background: BORDER, marginBottom: 24 }} />

        {/* Main bracket: West | Finals | East */}
        <div style={{ display: "flex", flex: 1, gap: 12 }}>
          {/* West side */}
          <div style={{ display: "flex", flex: 1, gap: 8 }}>
            <RoundColumn
              label="WEST R1"
              matchups={resolved.r1.west}
              picks={state.picks}
            />
            <RoundColumn
              label="SEMIS"
              matchups={resolved.r2.west}
              picks={state.picks}
              spacer={1}
            />
            <RoundColumn
              label="WEST FINAL"
              matchups={[resolved.r3.west]}
              picks={state.picks}
              spacer={3}
            />
          </div>

          {/* Center: Finals + Champion */}
          <FinalsColumn
            finalsMatch={resolved.finals}
            champion={resolved.champion}
            mvp={state.mvp}
            picks={state.picks}
          />

          {/* East side (mirrored) */}
          <div style={{ display: "flex", flex: 1, gap: 8, flexDirection: "row-reverse" }}>
            <RoundColumn
              label="EAST R1"
              matchups={resolved.r1.east}
              picks={state.picks}
              reverseTextAlign
            />
            <RoundColumn
              label="SEMIS"
              matchups={resolved.r2.east}
              picks={state.picks}
              spacer={1}
              reverseTextAlign
            />
            <RoundColumn
              label="EAST FINAL"
              matchups={[resolved.r3.east]}
              picks={state.picks}
              spacer={3}
              reverseTextAlign
            />
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    },
  );

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", CACHE_HEADERS);
  headers.set("Content-Type", "image/png");
  if (download) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="nba-26-pickem.png"`,
    );
  }

  return new Response(response.body, {
    status: 200,
    headers,
  });
}

// ---------------------------------------------------------------------------
// Helper components (Satori only supports a subset of flexbox)
// ---------------------------------------------------------------------------

function PlayInColumn({
  title,
  gameA,
  gameB,
  gameC,
  picks,
}: {
  title: string;
  gameA: Matchup;
  gameB: Matchup;
  gameC: Matchup;
  picks: Record<string, string | undefined>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
      <div style={{ display: "flex", fontSize: 14, fontWeight: 800, letterSpacing: "0.08em", color: INK }}>
        {title}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <PlayInGame label="Game A" sub="W = 7" matchup={gameA} picks={picks} />
        <PlayInGame label="Game B" sub="→ Game C" matchup={gameB} picks={picks} />
        <PlayInGame label="Game C" sub="W = 8" matchup={gameC} picks={picks} />
      </div>
    </div>
  );
}

function PlayInGame({
  label,
  sub,
  matchup,
  picks,
}: {
  label: string;
  sub: string;
  matchup: Matchup;
  picks: Record<string, string | undefined>;
}) {
  const pick = picks[matchup.id];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        background: "#ffffff",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: 8,
        gap: 4,
      }}
    >
      <div style={{ display: "flex", fontSize: 10, color: MUTED, fontWeight: 600 }}>
        {label} · {sub}
      </div>
      <TeamRow teamId={matchup.home?.teamId} seed={matchup.home?.seed} selected={pick === matchup.home?.teamId} compact />
      <TeamRow teamId={matchup.away?.teamId} seed={matchup.away?.seed} selected={pick === matchup.away?.teamId} compact />
    </div>
  );
}

function RoundColumn({
  label,
  matchups,
  picks,
  spacer = 0,
  reverseTextAlign = false,
}: {
  label: string;
  matchups: Matchup[];
  picks: Record<string, string | undefined>;
  spacer?: number;
  reverseTextAlign?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
      <div
        style={{
          display: "flex",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.1em",
          color: MUTED,
          justifyContent: "center",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-around",
          gap: 8,
          paddingTop: spacer * 18,
          paddingBottom: spacer * 18,
        }}
      >
        {matchups.map((m) => (
          <MatchupBox key={m.id} matchup={m} picks={picks} />
        ))}
      </div>
    </div>
  );
}

function FinalsColumn({
  finalsMatch,
  champion,
  mvp,
  picks,
}: {
  finalsMatch: Matchup;
  champion?: string;
  mvp: string;
  picks: Record<string, string | undefined>;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 260,
        alignItems: "center",
        gap: 12,
        paddingTop: 40,
      }}
    >
      <div style={{ display: "flex", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: MUTED }}>
        NBA FINALS
      </div>
      {/* Finals matchup with explicit team names */}
      <div style={{ display: "flex", flexDirection: "column", background: "#ffffff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 6, gap: 3, minWidth: 200 }}>
        {finalsMatch.home && (
          <div style={{ display: "flex", alignItems: "center", height: 38, background: picks[finalsMatch.id] === finalsMatch.home.teamId ? getTeam(finalsMatch.home.teamId).primary : "#ffffff", color: picks[finalsMatch.id] === finalsMatch.home.teamId ? "#ffffff" : "#111111", borderRadius: 6, paddingLeft: 4, paddingRight: 8, gap: 6 }}>
            <div style={{ display: "flex", width: 26, height: 26, borderRadius: "50%", background: getTeam(finalsMatch.home.teamId).primary, border: `2px solid ${getTeam(finalsMatch.home.teamId).secondary}`, alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
              {getTeam(finalsMatch.home.teamId).id}
            </div>
            <div style={{ display: "flex", fontSize: 14, opacity: 0.7, width: 14 }}>
              {finalsMatch.home.seed}
            </div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 700 }}>
              {getTeam(finalsMatch.home.teamId).name}
            </div>
          </div>
        )}
        {finalsMatch.away && (
          <div style={{ display: "flex", alignItems: "center", height: 38, background: picks[finalsMatch.id] === finalsMatch.away.teamId ? getTeam(finalsMatch.away.teamId).primary : "#ffffff", color: picks[finalsMatch.id] === finalsMatch.away.teamId ? "#ffffff" : "#111111", borderRadius: 6, paddingLeft: 4, paddingRight: 8, gap: 6 }}>
            <div style={{ display: "flex", width: 26, height: 26, borderRadius: "50%", background: getTeam(finalsMatch.away.teamId).primary, border: `2px solid ${getTeam(finalsMatch.away.teamId).secondary}`, alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
              {getTeam(finalsMatch.away.teamId).id}
            </div>
            <div style={{ display: "flex", fontSize: 14, opacity: 0.7, width: 14 }}>
              {finalsMatch.away.seed}
            </div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 700 }}>
              {getTeam(finalsMatch.away.teamId).name}
            </div>
          </div>
        )}
      </div>
      {champion ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: getTeam(champion).primary,
            color: getTeam(champion).text === "light" ? "#ffffff" : "#111111",
            padding: "14px 20px",
            borderRadius: 12,
            gap: 4,
            minWidth: 220,
          }}
        >
          <div style={{ display: "flex", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.85 }}>
            2026 NBA CHAMPIONS
          </div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 800, fontFamily: "serif" }}>
            {getTeam(champion).name}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            minWidth: 220,
            minHeight: 66,
            alignItems: "center",
            justifyContent: "center",
            fontStyle: "italic",
            color: MUTED,
            fontSize: 13,
            border: `1px dashed ${BORDER}`,
            borderRadius: 12,
          }}
        >
          Champion TBD
        </div>
      )}

      {mvp && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 11,
            color: MUTED,
            fontWeight: 700,
            marginTop: 4,
          }}
        >
          FINALS MVP
          <div style={{ display: "flex", fontSize: 18, color: INK, fontWeight: 700, marginTop: 2 }}>
            {mvp}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchupBox({
  matchup,
  picks,
  large = false,
}: {
  matchup: Matchup;
  picks: Record<string, string | undefined>;
  large?: boolean;
}) {
  const pick = picks[matchup.id];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: 6,
        gap: 3,
      }}
    >
      <TeamRow teamId={matchup.home?.teamId} seed={matchup.home?.seed} selected={pick === matchup.home?.teamId} large={large} />
      <TeamRow teamId={matchup.away?.teamId} seed={matchup.away?.seed} selected={pick === matchup.away?.teamId} large={large} />
    </div>
  );
}

function TeamRow({
  teamId,
  seed,
  selected,
  compact = false,
  large = false,
}: {
  teamId?: string;
  seed?: number | string;
  selected: boolean;
  compact?: boolean;
  large?: boolean;
}) {
  if (!teamId) {
    return (
      <div
        style={{
          display: "flex",
          height: compact ? 26 : large ? 38 : 30,
          alignItems: "center",
          color: "#bbb",
          fontSize: compact ? 11 : 13,
          fontStyle: "italic",
          paddingLeft: 8,
        }}
      >
        —
      </div>
    );
  }
  const t = getTeam(teamId);
  const bg = selected ? t.primary : "#ffffff";
  const color = selected ? (t.text === "light" ? "#ffffff" : "#111111") : "#111111";
  const h = compact ? 26 : large ? 38 : 30;
  const fontSize = compact ? 11 : large ? 16 : 13;
  const badgeSize = compact ? 18 : large ? 26 : 22;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: h,
        background: bg,
        color,
        borderRadius: 6,
        paddingLeft: 4,
        paddingRight: 8,
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          width: badgeSize,
          height: badgeSize,
          borderRadius: "50%",
          background: t.primary,
          border: `2px solid ${t.secondary}`,
          color: t.text === "light" ? "#ffffff" : "#111111",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(badgeSize * 0.38),
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {t.id}
      </div>
      <div style={{ display: "flex", fontSize: fontSize - 2, opacity: 0.7, width: 14 }}>
        {seed}
      </div>
      <div
        style={{
          display: "flex",
          fontSize,
          fontWeight: 700,
          overflow: "hidden",
          flex: 1,
        }}
      >
        {large ? t.name : t.shortName}
      </div>
    </div>
  );
}
