import { team as getTeam } from "@/lib/teams";

interface Props {
  teamId: string;
  size?: number;
}

/**
 * Simple circular "logo" — team primary color with a secondary-color ring
 * and the 3-letter abbreviation in the middle. No external assets, works in
 * both React DOM and Satori (OG image generation).
 */
export default function TeamBadge({ teamId, size = 28 }: Props) {
  const t = getTeam(teamId);
  const fontSize = Math.round(size * 0.38);
  const borderWidth = Math.max(1, Math.round(size * 0.08));
  const textColor = t.text === "light" ? "#ffffff" : "#111111";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: t.primary,
        border: `${borderWidth}px solid ${t.secondary}`,
        color: textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        flexShrink: 0,
      }}
    >
      {t.id}
    </div>
  );
}
