"use client";

import { buildings, labels, MAP_H, MAP_W, quayD, streets, waterD } from "@/lib/city";
import { ageSeconds, formatAge, staleLevel } from "@/lib/format";
import type { Conflict, Discovery, Robot, Selection } from "@/lib/types";

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
  const kite = robots.find((r) => r.id === "kite");
  const meshPairs: [Robot, Robot][] = [];
  if (showMesh) {
    for (let i = 0; i < robots.length; i++) {
      for (let j = i + 1; j < robots.length; j++) {
        const a = robots[i];
        const b = robots[j];
        if (a.radio === "lost" && b.radio === "lost") continue;
        if (radioDist(a, b) < 420 && (a.radio !== "lost" || b.class === "relay" || a.class === "relay")) {
          meshPairs.push([a, b]);
        }
      }
    }
  }

  const tasked = discoveries.filter((d) => d.assignedRobot);

  return (
    <div className={`absolute inset-0 overflow-hidden bg-[#0c0b10] ${tremor ? "tremor" : ""}`}>
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="img"
        aria-labelledby="mapTitle mapDesc"
        onClick={() => onSelect(null)}
      >
        <title id="mapTitle">Halcyon Sector 4 figure-ground</title>
        <desc id="mapDesc">
          Night survey of the waterfront. Stone buildings are what we have walked. Ghost outlines are unmapped.
          Copper rings are the last echo from each robot. Ember rings are voices.
        </desc>
        <defs>
          <pattern id="stipple" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.4" r="0.7" fill="#3a342c" />
          </pattern>
          <pattern id="rubble" width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill="#2a221c" />
            <path d="M1 11 L5 4 L10 10 M7 12 L12 6" stroke="#8a6a52" strokeWidth="1.1" fill="none" />
          </pattern>
          <pattern id="water" width="36" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q9 4 18 10 T36 10" fill="none" stroke="#3d5c5c" strokeWidth="1.1" opacity="0.55" />
          </pattern>
          <radialGradient id="vignette" cx="50%" cy="48%" r="68%">
            <stop offset="55%" stopColor="#0c0b10" stopOpacity="0" />
            <stop offset="100%" stopColor="#0c0b10" stopOpacity="0.55" />
          </radialGradient>
          <filter id="softglow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={MAP_W} height={MAP_H} fill="#14110e" />
        <path d={waterD} fill="#0f2a30" />
        <path d={waterD} fill="url(#water)" />
        <path d={quayD} fill="none" stroke="#7ec8c0" strokeWidth="2" opacity="0.45" />
        <path d="M70 210 H210 M70 210 V248 H198" fill="none" stroke="#8a9a88" strokeWidth="7" opacity="0.4" />
        <text x="90" y="238" fill="#6a8884" fontSize="10" fontFamily="IBM Plex Mono, monospace">
          PIER 4
        </text>

        {streets.map((s) => (
          <path
            key={s.id}
            d={s.d}
            fill="none"
            stroke={s.knowledge === "inferred" ? "#3a332c" : "#2c2822"}
            strokeWidth="42"
            strokeDasharray={s.knowledge === "inferred" ? "16 14" : undefined}
            strokeLinecap="round"
            opacity="0.55"
          />
        ))}

        {buildings.map((b) => {
          const unknown = b.knowledge === "unknown";
          if (unknown && !showUnknown) return null;
          const selectedB = selected?.type === "building" && selected.id === b.id;
          const fill =
            b.damage === "collapsed"
              ? "url(#rubble)"
              : unknown
                ? "url(#stipple)"
                : b.knowledge === "inferred"
                  ? "#b7a68c"
                  : "#e4d5ba";
          const stroke = selectedB ? "#ff4e1a" : unknown ? "#6a6256" : b.knowledge === "inferred" ? "#8a7a64" : "#2a241c";
          const combined = b.hole ? `${b.d} ${b.hole}` : b.d;
          return (
            <g
              key={b.id}
              role="button"
              tabIndex={0}
              aria-label={`${b.name}, ${b.knowledge}, ${b.damage}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ type: "building", id: b.id });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect({ type: "building", id: b.id });
              }}
              className="cursor-pointer"
            >
              <path
                d={combined}
                fill={fill}
                fillRule="evenodd"
                stroke={stroke}
                strokeWidth={selectedB ? 2.8 : unknown ? 1.1 : 1.6}
                strokeDasharray={b.knowledge === "inferred" || unknown ? "7 5" : undefined}
                opacity={unknown ? 0.55 : b.knowledge === "inferred" ? 0.72 : 1}
              />
              {b.damage === "partial" && !unknown ? (
                <path
                  d={`M${b.cx - 36} ${b.cy + 28} L${b.cx + 10} ${b.cy - 40} L${b.cx + 48} ${b.cy + 8}`}
                  fill="none"
                  stroke="#7a4a32"
                  strokeWidth="2"
                  opacity="0.7"
                />
              ) : null}
              {!unknown ? (
                <text
                  x={b.cx}
                  y={b.cy}
                  textAnchor="middle"
                  fill={b.knowledge === "inferred" ? "#4a4034" : "#2a241c"}
                  fontSize="13"
                  className="map-label"
                  letterSpacing="0.12em"
                >
                  {b.name.toUpperCase()}
                </text>
              ) : (
                <text
                  x={b.cx}
                  y={b.cy}
                  textAnchor="middle"
                  fill="#8a8070"
                  fontSize="11"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  UNHEARD
                </text>
              )}
            </g>
          );
        })}

        <path
          d="M420 720 L980 210"
          fill="none"
          stroke="#4a3028"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M420 720 L980 210"
          fill="none"
          stroke="#e35d4a"
          strokeWidth="2.4"
          strokeDasharray="8 12"
        />
        <text x="640" y="480" fill="#e35d4a" fontSize="12" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.18em">
          OVERPASS DOWN
        </text>

        {labels.map((l) => (
          <text
            key={l.name}
            x={l.x}
            y={l.y}
            fill="#7a7266"
            fontSize="12"
            letterSpacing="0.28em"
            className="map-label"
            transform={l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined}
          >
            {l.name}
          </text>
        ))}

        <text
          x="1180"
          y="920"
          textAnchor="end"
          fill="#3a342c"
          fontSize="52"
          className="serif"
          opacity="0.55"
        >
          Sector 4
        </text>

        {kite && kite.radio !== "lost" ? (
          <g transform={`translate(${kite.x} ${kite.y})`} pointerEvents="none">
            <g className="sweep">
              <path d="M0 0 L140 -28 A144 144 0 0 1 140 28 Z" fill="#e0a36a" opacity="0.08" />
            </g>
          </g>
        ) : null}

        {meshPairs.map(([a, b]) => {
          const weak = a.radio === "weak" || b.radio === "weak" || a.radio === "lost" || b.radio === "lost";
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2 - 28;
          return (
            <path
              key={a.id + b.id}
              d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`}
              fill="none"
              stroke="#e0a36a"
              strokeWidth={weak ? 1 : 1.5}
              strokeDasharray={weak ? "4 8" : "2 10"}
              opacity={weak ? 0.28 : 0.5}
            />
          );
        })}

        {tasked.map((d) => {
          const r = robots.find((x) => x.id === d.assignedRobot);
          if (!r) return null;
          return (
            <path
              key={`task-${d.id}`}
              d={`M${r.x} ${r.y} Q${(r.x + d.x) / 2} ${(r.y + d.y) / 2 - 40} ${d.x} ${d.y}`}
              fill="none"
              stroke="#ff4e1a"
              strokeWidth="1.6"
              strokeDasharray="5 7"
              opacity="0.8"
            />
          );
        })}

        {robots.map((r) => {
          const age = ageSeconds(nowSec, r.lastHeardSec);
          const stale = staleLevel(nowSec, r.lastHeardSec);
          const ghost = r.radio === "lost" && showLastKnown;
          const color = r.radio === "lost" ? "#8a8070" : "#e0a36a";
          const ring = Math.min(120, 22 + age * 0.28);
          const sel = selected?.type === "robot" && selected.id === r.id;
          return (
            <g
              key={r.id}
              transform={`translate(${r.x} ${r.y})`}
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
              opacity={ghost ? 0.62 : 1}
              filter={r.radio !== "lost" ? "url(#softglow)" : undefined}
            >
              <circle r={ring} fill="none" stroke={color} strokeWidth="1" opacity={r.radio === "lost" ? 0.25 : 0.35} />
              <circle r={ring * 0.62} fill="none" stroke={color} strokeWidth="0.8" opacity="0.22" />
              {r.radio === "lost" ? (
                <circle r={ring * 1.25} fill="none" stroke={color} strokeWidth="0.6" strokeDasharray="3 7" opacity="0.2" />
              ) : null}
              <g transform={`rotate(${r.heading})`}>
                <path d="M0 -11 L8 9 L0 4 L-8 9 Z" fill={color} stroke="#0c0b10" strokeWidth="1.3" />
              </g>
              {sel ? <circle r="18" fill="none" stroke={color} strokeWidth="1.3" strokeDasharray="3 4" /> : null}
              <text y="28" textAnchor="middle" fill={color} fontSize="11" fontFamily="IBM Plex Mono, monospace">
                {r.callsign}
              </text>
              {stale !== "live" ? (
                <text y="42" textAnchor="middle" fill="#f5c518" fontSize="9" fontFamily="IBM Plex Mono, monospace">
                  {formatAge(nowSec, r.lastHeardSec)}
                </text>
              ) : null}
            </g>
          );
        })}

        {discoveries.map((d) => {
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
              filter={d.kind === "survivor" ? "url(#softglow)" : undefined}
            >
              {d.kind === "survivor" ? (
                <>
                  <g className="knock">
                    <circle r="14" fill="#ff4e1a" opacity="0.2" />
                  </g>
                  <g className="knock" style={{ animationDelay: "0.9s" }}>
                    <circle r="14" fill="#ff4e1a" opacity="0.12" />
                  </g>
                  <circle r="6.5" fill="#ff4e1a" stroke="#fff6e8" strokeWidth="1.6" />
                  {d.people ? (
                    <text y="4" textAnchor="middle" fill="#fff6e8" fontSize="8" fontFamily="IBM Plex Mono, monospace">
                      {d.people}
                    </text>
                  ) : null}
                </>
              ) : d.kind === "hazard" ? (
                <path d="M0 -11 L10 8 H-10 Z" fill="#f5c518" stroke="#0c0b10" strokeWidth="1.4" />
              ) : d.kind === "blocked" ? (
                <path d="M-8 -8 L8 8 M8 -8 L-8 8" stroke="#e35d4a" strokeWidth="3" />
              ) : (
                <path d="M-11 0 H11 M0 -11 V11" stroke="#c8d5b8" strokeWidth="2.2" />
              )}
              {sel ? <circle r="16" fill="none" stroke={d.kind === "survivor" ? "#ff4e1a" : "#f3ead8"} strokeWidth="1.3" /> : null}
            </g>
          );
        })}

        {conflict && !conflict.resolved ? (
          <g transform={`translate(${conflict.x} ${conflict.y})`} pointerEvents="none">
            <circle r="34" fill="none" stroke="#f5c518" strokeWidth="1.5" strokeDasharray="5 5" />
            <text y="-42" textAnchor="middle" fill="#f5c518" fontSize="11" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.2em">
              TWO ECHOES
            </text>
          </g>
        ) : null}

        <g transform="translate(70,880)" fill="#7a7266" className="map-label">
          <circle r="22" fill="none" stroke="#7a7266" strokeWidth="1" />
          <path d="M0 -16 V16 M-16 0 H16" stroke="#7a7266" strokeWidth="1" />
          <polygon points="0,-20 4,-8 -4,-8" fill="#e0a36a" />
          <text x="32" y="4" fontSize="11" letterSpacing="0.2em">
            N · 80 m
          </text>
        </g>

        <rect width={MAP_W} height={MAP_H} fill="url(#vignette)" pointerEvents="none" />
      </svg>
    </div>
  );
}
