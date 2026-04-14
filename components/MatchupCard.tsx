"use client";

import { Matchup } from "@/lib/bracket";
import TeamButton from "./TeamButton";

interface Props {
  matchup: Matchup;
  pick?: string;
  onPick: (teamId: string) => void;
  labelOverride?: string;
  sub?: string;
}

export default function MatchupCard({ matchup, pick, onPick, labelOverride, sub }: Props) {
  const label = labelOverride ?? matchup.label;
  const subLabel = sub ?? matchup.sub;
  const locked = matchup.locked || !matchup.home || !matchup.away;

  return (
    <div className="bg-white rounded-xl border border-[#e6e3d8] p-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="mb-2 text-[11px] font-semibold tracking-wide uppercase text-[#6b6b6b]">
        {label}
        {subLabel && (
          <span className="ml-2 font-normal normal-case tracking-normal text-[#8a8a8a]">
            {subLabel}
          </span>
        )}
      </div>

      {locked ? (
        <div className="py-4 text-center text-sm text-[#8a8a8a] italic">
          Locked — complete earlier round
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <TeamButton
            teamId={matchup.home!.teamId}
            seed={matchup.home!.seed}
            selected={pick === matchup.home!.teamId}
            onClick={() => onPick(matchup.home!.teamId)}
          />
          <TeamButton
            teamId={matchup.away!.teamId}
            seed={matchup.away!.seed}
            selected={pick === matchup.away!.teamId}
            onClick={() => onPick(matchup.away!.teamId)}
          />
        </div>
      )}
    </div>
  );
}
