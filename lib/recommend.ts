import type { Discovery, Radio, Robot } from "./types";

const CLASS_FIT: Record<string, Partial<Record<Robot["class"], number>>> = {
  survivor_void: { crawler: 1, snake: 1, acoustic: 0.55, heavy: 0.35, uav: 0.1, relay: 0.05 },
  survivor_floor: { snake: 0.9, acoustic: 0.85, heavy: 0.7, crawler: 0.6, uav: 0.25, relay: 0.05 },
  survivor_hospital: { heavy: 1, snake: 0.6, acoustic: 0.5, crawler: 0.4, uav: 0.2, relay: 0.05 },
  hazard: { uav: 0.9, heavy: 0.7, crawler: 0.4, snake: 0.3, acoustic: 0.2, relay: 0.1 },
  blocked: { heavy: 1, uav: 0.6, crawler: 0.4, snake: 0.2, acoustic: 0.1, relay: 0.1 },
  route: { uav: 1, crawler: 0.5, heavy: 0.4, snake: 0.3, acoustic: 0.2, relay: 0.2 },
  restore: { relay: 1, uav: 0.4, crawler: 0.2, heavy: 0.2, snake: 0.1, acoustic: 0.1 },
};

function radioScore(r: Radio) {
  if (r === "strong") return 1;
  if (r === "weak") return 0.55;
  return 0.12;
}

function pathConfidence(robot: Robot, target: { x: number; y: number }) {
  const dist = Math.hypot(robot.x - target.x, robot.y - target.y);
  const radio = radioScore(robot.radio);
  const knownBias = robot.radio === "lost" ? 0.25 : 0.72;
  return Math.max(0.18, Math.min(0.97, knownBias + radio * 0.18 - dist / 1800));
}

export type Recommendation = {
  robot: Robot;
  score: number;
  etaMin: number;
  pathConfidence: number;
  why: string[];
  caution?: string;
};

export function recommendFor(discovery: Discovery, robots: Robot[]): Recommendation[] {
  const key =
    discovery.kind === "survivor" && discovery.access?.toLowerCase().includes("void")
      ? "survivor_void"
      : discovery.kind === "survivor" && discovery.access?.toLowerCase().includes("hospital")
        ? "survivor_hospital"
        : discovery.kind === "survivor"
          ? "survivor_floor"
          : discovery.kind === "hazard"
            ? "hazard"
            : discovery.kind === "blocked"
              ? "blocked"
              : "route";

  return robots
    .map((robot) => {
      const fit = CLASS_FIT[key]?.[robot.class] ?? 0.2;
      const radio = radioScore(robot.radio);
      const dist = Math.hypot(robot.x - discovery.x, robot.y - discovery.y);
      const path = pathConfidence(robot, discovery);
      const battery = robot.battery / 100;
      const score = fit * 42 + path * 28 + radio * 18 + battery * 12 - dist / 40;
      const etaMin = Math.max(2, Math.round(dist / 55 + (robot.radio === "lost" ? 6 : 1)));
      const why: string[] = [];
      if (fit >= 0.85) why.push("right body for this void / structure");
      else if (fit >= 0.6) why.push("capable, not specialized");
      if (radio === 1) why.push("radio is strong — orders will land");
      if (robot.radio === "lost") why.push("last-known only — may not receive this");
      if (path > 0.8) why.push("route is mostly confirmed streets");
      else if (path < 0.45) why.push("route is inferred or dark");
      if (robot.battery < 35) why.push("battery thin");
      const caution =
        robot.radio === "lost"
          ? "Queued until a relay hears this unit again."
          : path < 0.45
            ? "You would be sending them through a guess."
            : undefined;
      return { robot, score, etaMin, pathConfidence: path, why, caution };
    })
    .sort((a, b) => b.score - a.score);
}
