"use client";

import { team as getTeam } from "@/lib/teams";
import TeamBadge from "./TeamBadge";

interface Props {
  teamId: string;
  seed: number | string;
  selected: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

export default function TeamButton({
  teamId,
  seed,
  selected,
  onClick,
  size = "md",
  disabled = false,
}: Props) {
  const t = getTeam(teamId);
  const textColor = selected && t.text === "light" ? "#ffffff" : "#111111";
  const bg = selected ? t.primary : "#ffffff";
  const borderColor = selected ? t.primary : "#e6e3d8";
  const heightClass = size === "sm" ? "min-h-[48px]" : "min-h-[56px]";
  const padX = size === "sm" ? "px-3" : "px-3.5";
  const badgeSize = size === "sm" ? 26 : 30;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group w-full ${heightClass} ${padX} py-2 rounded-lg flex items-center gap-3 text-left transition-colors active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{
        background: bg,
        border: `1.5px solid ${borderColor}`,
        color: textColor,
      }}
      aria-pressed={selected}
      aria-label={`Pick ${t.name}`}
    >
      <TeamBadge teamId={teamId} size={badgeSize} />
      <span
        className="flex-shrink-0 text-xs tabular-nums opacity-70"
        style={{ color: textColor, width: 14 }}
      >
        {seed}
      </span>
      <span
        className="flex-1 font-semibold truncate"
        style={{ color: textColor, fontSize: size === "sm" ? 14 : 15 }}
      >
        {t.name}
      </span>
      {selected && (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={textColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}
