"use client";

import { buildings, streets } from "@/lib/scenario";
import { formatAge, staleLevel } from "@/lib/format";
import type { Conflict, Discovery, Robot, Selection } from "@/lib/types";

const W = 1000;
const H = 640;

function radioDist(a: Robot, b: Robot) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function MapView({
  robots,
  discoveries,
  nowSec,
  selected,
  onSelect,
  showUnknown,
  showMesh,
  showLastKnown,
  conflict,
  tremor,
}: {
  robots: Robot[];
  discoveries: Discovery[];
  nowSec: number;
  selected: Selection;
  onSelect: (s: Selection) => void;
  showUnknown: boolean;
  showMesh: boolean;
  showLastKnown: boolean;
  conflict: Conflict | null;
  tremor: boolean;
}) {
  const meshPairs: [Robot, Robot][] = [];
  if (showMesh) {
    for (let i = 0; i < robots.length; i++) {
      for (let j = i + 1; j < robots.length; j++) {
        const a = robots[i];
        const b = robots[j];
        if (a.radio === "lost" && b.radio === "lost") continue;
        if (radioDist(a, b) < 280 && (a.radio !== "lost" || b.class === "relay" || a.class === "relay")) {
          meshPairs.push([a, b]);
        }
      }
    }
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-[#0a0e0c] ${tremor ? "tremor" : ""}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        role="img"
        aria-labelledby="mapTitle mapDesc"
      >
        <title id="mapTitle">Sector 4 common operating picture</title>
        <desc id="mapDesc">
          Map of Halcyon Waterfront. Confirmed buildings are solid. Inferred buildings are dashed.
          Unknown districts are hatched. Robots and discoveries are marked.
        </desc>
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#2a332e" strokeWidth="2" />
          </pattern>
          <pattern id="rubble" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#1a1512" />
            <path d="M1 8 L4 3 L8 7" stroke="#5a4032" strokeWidth="1" fill="none" />
            <rect x="5" y="5" width="3" height="2" fill="#3d2c24" />
          </pattern>
          <pattern id="water" width="24" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6 Q6 2 12 6 T24 6" fill="none" stroke="#1b3a3a" strokeWidth="1" />
          </pattern>
          <radialGradient id="fog" cx="85%" cy="20%" r="45%">
            <stop offset="0%" stopColor="#070908" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#070908" stopOpacity="0" />
          </radialGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        <rect width={W} height={H} fill="#0d1210" />
        <path d="M0 0 H78 V640 H0 Z" fill="#0c1818" />
        <path d="M0 0 H78 V640 H0 Z" fill="url(#water)" opacity="0.9" />
        <text x="18" y="320" fill="#4d6e6c" fontSize="11" fontFamily="IBM Plex Mono, monospace" transform="rotate(-90 18 320)">
          CANAL
        </text>

        {streets.map((s) => (
          <g key={s.id}>
            <path
              d={s.d}
              fill="none"
              stroke={s.knowledge === "unknown" ? "transparent" : s.knowledge === "inferred" ? "#2a3530" : "#24302b"}
              strokeWidth={s.id.startsWith("s") && ["s1", "s2", "s3", "s4"].includes(s.id) ? 22 : 16}
              strokeDasharray={s.knowledge === "inferred" ? "10 8" : undefined}
              strokeLinecap="butt"
            />
            {s.blocked ? (
              <path d={s.d} fill="none" stroke="#c45c4a" strokeWidth="2.2" strokeDasharray="6 10" opacity="0.75" />
            ) : null}
          </g>
        ))}

        {buildings.map((b) => {
          const isUnknown = b.knowledge === "unknown";
          if (isUnknown && !showUnknown) return null;
          const fill =
            b.damage === "collapsed"
              ? "url(#rubble)"
              : isUnknown
                ? "url(#hatch)"
                : b.knowledge === "inferred"
                  ? "#151c18"
                  : "#1a221e";
          const stroke =
            b.damage === "collapsed"
              ? "#8a5a48"
              : isUnknown
                ? "#3a463f"
                : b.knowledge === "inferred"
                  ? "#4a5c54"
                  : "#6d7f74";
          const selectedB = selected?.type === "building" && selected.id === b.id;
          return (
            <g
              key={b.id}
              role="button"
              tabIndex={0}
              aria-label={`${b.name}, ${b.knowledge}, ${b.damage}`}
              onClick={() => onSelect({ type: "building", id: b.id })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect({ type: "building", id: b.id });
              }}
              className="cursor-pointer focus:outline-none"
            >
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={fill}
                stroke={selectedB ? "#e4a574" : stroke}
                strokeWidth={selectedB ? 2.4 : b.knowledge === "inferred" ? 1.2 : 1.6}
                strokeDasharray={b.knowledge === "inferred" ? "5 4" : undefined}
                rx="3"
              />
              {b.damage === "partial" && b.knowledge !== "unknown" ? (
                <path
                  d={`M${b.x + 8} ${b.y + b.h - 8} L${b.x + b.w * 0.45} ${b.y + 10} L${b.x + b.w - 10} ${b.y + b.h * 0.55}`}
                  stroke="#8a6a3a"
                  strokeWidth="1.4"
                  fill="none"
                  opacity="0.8"
                />
              ) : null}
              {b.knowledge !== "unknown" ? (
                <text
                  x={b.x + 8}
                  y={b.y + 16}
                  fill="#8f958c"
                  fontSize="10"
                  fontFamily="IBM Plex Sans, sans-serif"
                >
                  {b.name}
                </text>
              ) : (
                <text
                  x={b.x + 8}
                  y={b.y + 16}
                  fill="#5c625c"
                  fontSize="10"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  UNMAPPED
                </text>
              )}
            </g>
          );
        })}

        {showUnknown ? <rect width={W} height={H} fill="url(#fog)" pointerEvents="none" /> : null}

        <path
          d="M300 430 L640 175"
          fill="none"
          stroke="#6a4034"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M300 430 L640 175"
          fill="none"
          stroke="#c45c4a"
          strokeWidth="2"
          strokeDasharray="4 8"
          opacity="0.9"
        />
        <text x="430" y="292" fill="#c45c4a" fontSize="10" fontFamily="IBM Plex Mono, monospace">
          OVERPASS DOWN
        </text>

        {meshPairs.map(([a, b]) => {
          const weak = a.radio === "weak" || b.radio === "weak" || a.radio === "lost" || b.radio === "lost";
          return (
            <line
              key={a.id + b.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#7ebfb8"
              strokeWidth={weak ? 1 : 1.4}
              strokeDasharray={weak ? "3 6" : "1 0"}
              opacity={weak ? 0.35 : 0.55}
            />
          );
        })}

        {discoveries.map((d) => {
          const color =
            d.kind === "survivor" ? "#e4a574" : d.kind === "hazard" ? "#d4a017" : d.kind === "blocked" ? "#c45c4a" : "#a8c5a0";
          const sel = selected?.type === "discovery" && selected.id === d.id;
          return (
            <g
              key={d.id}
              transform={`translate(${d.x} ${d.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${d.kind}: ${d.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "discovery", id: d.id });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect({ type: "discovery", id: d.id });
              }}
              className="cursor-pointer"
            >
              {d.kind === "survivor" ? (
                <circle r="16" fill={color} opacity="0.12" className="pulse-ring origin-center" />
              ) : null}
              {d.kind === "survivor" ? (
                <circle r="7.5" fill={color} stroke="#0b0d0c" strokeWidth="2" />
              ) : d.kind === "hazard" ? (
                <polygon points="0,-9 8,7 -8,7" fill={color} stroke="#0b0d0c" strokeWidth="1.5" />
              ) : d.kind === "blocked" ? (
                <rect x="-6" y="-6" width="12" height="12" fill={color} stroke="#0b0d0c" strokeWidth="1.5" transform="rotate(45)" />
              ) : (
                <path d="M-8 0 L-2 0 M2 0 L8 0 M0 -8 L0 -2 M0 2 L0 8" stroke={color} strokeWidth="2.2" />
              )}
              {sel ? <circle r="13" fill="none" stroke={color} strokeWidth="1.4" /> : null}
            </g>
          );
        })}

        {robots.map((r) => {
          const stale = staleLevel(nowSec, r.lastHeardSec);
          const ghost = r.radio === "lost" && showLastKnown;
          const color = r.radio === "lost" ? "#8f958c" : "#7ebfb8";
          const sel = selected?.type === "robot" && selected.id === r.id;
          return (
            <g
              key={r.id}
              transform={`translate(${r.x} ${r.y}) rotate(${r.heading})`}
              role="button"
              tabIndex={0}
              aria-label={`${r.callsign}, ${r.status}, ${formatAge(nowSec, r.lastHeardSec)}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "robot", id: r.id });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect({ type: "robot", id: r.id });
              }}
              className="cursor-pointer"
              opacity={ghost ? 0.55 : 1}
            >
              {r.radio !== "lost" ? (
                <circle r={r.radio === "strong" ? 42 : 24} fill={color} opacity="0.07" />
              ) : null}
              <path d="M0 -10 L8 8 L0 4 L-8 8 Z" fill={color} stroke="#0b0d0c" strokeWidth="1.4" />
              {sel ? <circle r="16" fill="none" stroke={color} strokeWidth="1.3" strokeDasharray="3 3" /> : null}
              <g transform={`rotate(${-r.heading})`}>
                <text
                  y="22"
                  textAnchor="middle"
                  fill={color}
                  fontSize="10"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {r.callsign}
                </text>
                {stale !== "live" ? (
                  <text
                    y="34"
                    textAnchor="middle"
                    fill="#e0c07a"
                    fontSize="8"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {formatAge(nowSec, r.lastHeardSec)}
                  </text>
                ) : null}
              </g>
            </g>
          );
        })}

        {conflict && !conflict.resolved ? (
          <g transform={`translate(${conflict.x} ${conflict.y})`}>
            <circle r="22" fill="none" stroke="#e0c07a" strokeWidth="1.4" strokeDasharray="4 4" />
            <text
              y="-28"
              textAnchor="middle"
              fill="#e0c07a"
              fontSize="10"
              fontFamily="IBM Plex Mono, monospace"
            >
              CONTESTED
            </text>
          </g>
        ) : null}
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-muted">
        <LegendDot color="#1a221e" label="Confirmed" />
        <LegendDot color="#4a5c54" dashed label="Inferred" />
        <LegendDot hatch label="Unknown" />
        <LegendDot color="#e4a574" label="Life" />
        <LegendDot color="#7ebfb8" label="Robot" />
        <LegendDot color="#d4a017" label="Hazard" />
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed,
  hatch,
}: {
  color?: string;
  label: string;
  dashed?: boolean;
  hatch?: boolean;
}) {
  return (
    <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-full border border-line bg-bg/70 px-2 py-1">
      <span
        className="inline-block h-2.5 w-2.5 rounded-[2px]"
        style={{
          background: hatch ? "repeating-linear-gradient(45deg,#2a332e 0 2px,transparent 2px 4px)" : color,
          outline: dashed ? "1px dashed #8f958c" : undefined,
        }}
      />
      {label}
    </span>
  );
}
