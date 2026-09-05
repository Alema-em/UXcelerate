export function formatMissionClock(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `T+${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatAge(nowSec: number, lastSec: number) {
  const d = Math.max(0, nowSec - lastSec);
  if (d < 5) return "live";
  if (d < 60) return `${d}s ago`;
  const m = Math.floor(d / 60);
  const s = d % 60;
  return `${m}m ${pad(s)}s ago`;
}

export function ageSeconds(nowSec: number, lastSec: number) {
  return Math.max(0, nowSec - lastSec);
}

export function staleLevel(nowSec: number, lastSec: number): "live" | "aging" | "stale" | "lost" {
  const d = ageSeconds(nowSec, lastSec);
  if (d < 15) return "live";
  if (d < 60) return "aging";
  if (d < 180) return "stale";
  return "lost";
}

export function confidenceLabel(n: number) {
  if (n >= 0.8) return "high";
  if (n >= 0.55) return "medium";
  return "low";
}

export function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
