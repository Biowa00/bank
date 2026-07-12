import type { CSSProperties } from "react";

/**
 * Mini-barre de progression de la jauge de retrait (0-100 %).
 * Présentational — utilisable côté serveur (liste, fiche).
 */
export function WithdrawalGauge({
  progress,
  size = "md",
  showLabel = true,
}: {
  progress: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const full = pct >= 100;
  const height = size === "sm" ? "h-1.5" : "h-2.5";
  const style: CSSProperties = { width: `${pct}%` };

  return (
    <div className="flex items-center gap-2">
      <div className={`relative flex-1 overflow-hidden rounded-full bg-black/[.06] ${height}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${
            full ? "bg-accent-500" : "bg-brand-500"
          }`}
          style={style}
        />
      </div>
      {showLabel && (
        <span
          className={`shrink-0 tabular-nums text-xs font-semibold ${
            full ? "text-accent-600" : "text-ink/60"
          }`}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
