"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapView } from "@/components/map-view";
import { Mark } from "@/components/mark";
import { formatAge, formatMissionClock, pct, staleLevel } from "@/lib/format";
import { recommendFor } from "@/lib/recommend";
import {
  INCIDENT,
  MISSION_START_SEC,
  buildings,
  initialDiscoveries,
  initialRobots,
  mapKnownFrom,
  simEvents,
} from "@/lib/scenario";
import type {
  CommsState,
  Conflict,
  Discovery,
  QueuedCommand,
  Robot,
  Selection,
  Toast,
} from "@/lib/types";

export function CommandApp() {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [robots, setRobots] = useState<Robot[]>(initialRobots);
  const [discoveries, setDiscoveries] = useState<Discovery[]>(initialDiscoveries);
  const [comms, setComms] = useState<CommsState>("nominal");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [selected, setSelected] = useState<Selection>({ type: "discovery", id: "s14" });
  const [queue, setQueue] = useState<QueuedCommand[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState("Command picture open. Three survivor signals on the board.");
  const [tremor, setTremor] = useState(false);
  const [showUnknown, setShowUnknown] = useState(true);
  const [showMesh, setShowMesh] = useState(true);
  const [showLastKnown, setShowLastKnown] = useState(true);
  const [tour, setTour] = useState(true);
  const nowSec = MISSION_START_SEC + elapsed;
  const seen = useRef<Set<number>>(new Set());

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${t.title}`;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 7000);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    setRobots((prev) =>
      prev.map((r) => {
        if (r.radio === "lost") return r;
        const drift = r.class === "uav" ? 1.2 : 0.15;
        return {
          ...r,
          lastHeardSec: nowSec,
          x: r.x + Math.sin((nowSec + r.heading) / 18) * (r.class === "uav" ? 0.4 : 0.05) * drift,
          y: r.y + Math.cos((nowSec + r.heading) / 20) * (r.class === "uav" ? 0.35 : 0.04) * drift,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  useEffect(() => {
    const due = simEvents.filter((ev) => ev.at <= elapsed && !seen.current.has(ev.at));
    if (!due.length) return;
    const next = new Set(seen.current);
    for (const ev of due) {
      next.add(ev.at);
      if (ev.type === "route" || ev.type === "survivor" || ev.type === "hazard") {
        setDiscoveries((d) => [ev.discovery, ...d]);
        setLive(`${ev.discovery.kind} discovered: ${ev.discovery.title}`);
        pushToast({
          title: ev.discovery.kind === "survivor" ? "Life signal" : ev.discovery.title,
          body: ev.discovery.detail,
          tone: ev.discovery.kind === "survivor" ? "life" : ev.discovery.kind === "hazard" ? "warn" : "ok",
        });
      }
      if (ev.type === "confidence") {
        setDiscoveries((d) =>
          d.map((x) =>
            x.id === ev.discoveryId
              ? { ...x, confidence: ev.confidence, detail: ev.detail, lastUpdateSec: nowSec }
              : x,
          ),
        );
        setLive(ev.detail);
      }
      if (ev.type === "comms") {
        setComms(ev.state);
        setRobots((rs) =>
          rs.map((r) => (ev.lost.includes(r.id) ? { ...r, radio: "lost", status: "silent" } : r)),
        );
        setLive(ev.note);
        pushToast({ title: "Mesh degraded", body: ev.note, tone: "warn" });
      }
      if (ev.type === "conflict") {
        setConflict(ev.conflict);
        setDiscoveries((d) => d.map((x) => (x.id === "b-harbor" ? { ...x, status: "contested" } : x)));
        setLive(ev.conflict.title);
        pushToast({ title: "Map conflict", body: ev.conflict.detail, tone: "warn" });
      }
      if (ev.type === "aftershock") {
        setTremor(true);
        window.setTimeout(() => setTremor(false), 1000);
        setLive(ev.note);
        pushToast({ title: "Aftershock", body: ev.note, tone: "warn" });
      }
      if (ev.type === "restore") {
        setComms("restoring");
        setRobots((rs) =>
          rs.map((r) =>
            r.id === ev.robotId ? { ...r, radio: "weak", status: "searching", lastHeardSec: nowSec } : r,
          ),
        );
        setDiscoveries((d) =>
          d.map((x) =>
            x.id === "s09"
              ? {
                  ...x,
                  confidence: 0.7,
                  people: 2,
                  detail: ev.dump,
                  lastUpdateSec: nowSec,
                  staleWarning: undefined,
                  title: "Two rhythms in the parking void",
                }
              : x,
          ),
        );
        setQueue((q) => {
          if (!q.length) return q;
          pushToast({ title: "Queued orders flushing", body: "RELAY is delivering what you asked while it was dark.", tone: "mesh" });
          return [];
        });
        setLive(ev.dump);
        pushToast({ title: "MOLE is an echo again", body: ev.dump, tone: "mesh" });
        window.setTimeout(() => setComms("nominal"), 4000);
      }
    }
    seen.current = next;
  }, [elapsed, nowSec, pushToast]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
      if (e.key === "Escape") setSelected(null);
      if (e.key >= "1" && e.key <= "6") {
        const r = robots[Number(e.key) - 1];
        if (r) setSelected({ type: "robot", id: r.id });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [robots]);

  const known = mapKnownFrom(buildings);
  const lives = discoveries.filter((d) => d.kind === "survivor");
  const people = lives.reduce((a, d) => a + (d.people ?? 0), 0);

  const selectedRobot = selected?.type === "robot" ? robots.find((r) => r.id === selected.id) : undefined;
  const selectedDiscovery =
    selected?.type === "discovery" ? discoveries.find((d) => d.id === selected.id) : undefined;
  const selectedBuilding =
    selected?.type === "building" ? buildings.find((b) => b.id === selected.id) : undefined;

  const triage = useMemo(() => {
    const rank = (d: Discovery) => {
      const kindRank = d.kind === "survivor" ? 0 : d.kind === "hazard" ? 1 : d.kind === "blocked" ? 2 : 3;
      return kindRank * 10 + (d.priority ?? 9);
    };
    return [...discoveries].sort((a, b) => rank(a) - rank(b));
  }, [discoveries]);

  function assign(robot: Robot, discovery: Discovery) {
    const rec = recommendFor(discovery, [robot])[0];
    const label = `${robot.callsign} → ${discovery.title}`;
    if (robot.radio === "lost") {
      setQueue((q) => [...q, { id: `${robot.id}-${nowSec}`, robotId: robot.id, label, createdSec: nowSec }]);
      setRobots((rs) => rs.map((r) => (r.id === robot.id ? { ...r, status: "queued" } : r)));
      setDiscoveries((ds) =>
        ds.map((d) => (d.id === discovery.id ? { ...d, status: "assigned", assignedRobot: robot.id } : d)),
      );
      setLive(`Order queued for ${robot.callsign}. It will send when the mesh hears them.`);
      pushToast({ title: "Queued, not sent", body: label + ". Radio is dark.", tone: "warn" });
      return;
    }
    setRobots((rs) => rs.map((r) => (r.id === robot.id ? { ...r, status: "tasked" } : r)));
    setDiscoveries((ds) =>
      ds.map((d) => (d.id === discovery.id ? { ...d, status: "assigned", assignedRobot: robot.id } : d)),
    );
    setLive(`${robot.callsign} tasked. Path confidence ${pct(rec.pathConfidence)}.`);
    pushToast({
      title: `${robot.callsign} tasked`,
      body: `ETA ~${rec.etaMin} min · path ${pct(rec.pathConfidence)} confirmed`,
      tone: "ok",
    });
  }

  function resolveConflict(choice: "aerial" | "ground" | "contested") {
    setConflict((c) => (c ? { ...c, resolved: choice } : c));
    setDiscoveries((ds) =>
      ds.map((d) =>
        d.id === "b-harbor"
          ? {
              ...d,
              status: choice === "contested" ? "contested" : "resolved",
              title:
                choice === "aerial"
                  ? "Harbor shoulder treated as open"
                  : choice === "ground"
                    ? "Harbor Street treated as blocked"
                    : "Harbor Street still contested",
              confidence: choice === "contested" ? 0.5 : 0.78,
            }
          : d,
      ),
    );
    setLive(
      choice === "contested"
        ? "Both reports kept. The street stays striped until a ground unit walks it."
        : `Harbor Street resolved using ${choice} report.`,
    );
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-bg text-ink">
      <a href="#triage" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-paper focus:p-3 focus:text-paper-ink">
        Skip to triage
      </a>
      <div aria-live="assertive" className="sr-only">
        {live}
      </div>

      <MapView
        robots={robots}
        discoveries={discoveries}
        nowSec={nowSec}
        selected={selected}
        onSelect={setSelected}
        showUnknown={showUnknown}
        showMesh={showMesh}
        showLastKnown={showLastKnown}
        conflict={conflict}
        tremor={tremor}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-5">
        <Link href="/" className="pointer-events-auto focus-ring flex items-center gap-2">
          <Mark className="h-7 w-7" />
          <span className="tracking-[0.28em] text-sm">ECHO</span>
        </Link>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-3 text-right">
          <div className="hidden sm:block">
            <div className="serif text-2xl leading-none">{formatMissionClock(nowSec)}</div>
            <div className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-faint">
              {INCIDENT.place} · {people} lives · {pct(known)} heard
            </div>
          </div>
          <CommsPill state={comms} />
          <select
            className="focus-ring max-w-[130px] border border-line bg-black/40 px-2 py-1 text-[11px] backdrop-blur"
            value=""
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v) && v > elapsed) setElapsed(v);
              e.target.value = "";
            }}
            aria-label="Jump incident clock"
          >
            <option value="">Jump</option>
            <option value="32">Mesh dies</option>
            <option value="45">Street conflict</option>
            <option value="72">Aftershock</option>
            <option value="96">MOLE returns</option>
          </select>
          <button
            type="button"
            className="focus-ring border border-line px-2 py-1 text-[11px] uppercase tracking-[0.16em]"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      {comms !== "nominal" ? (
        <div
          role="status"
          className="absolute inset-x-0 top-[4.4rem] z-20 mx-auto max-w-3xl bg-[#f5c518] px-4 py-2 text-center text-sm text-[#1c1612]"
        >
          <span className="mono mr-2 text-[10px] uppercase tracking-[0.2em]">
            {comms === "degraded" ? "Last-known picture" : "Mesh restoring"}
          </span>
          Silent robots keep their last pose. Orders queue on RELAY. {queue.length} held.
        </div>
      ) : null}

      <div className="absolute bottom-5 left-5 z-20 hidden gap-2 md:flex">
        {robots.map((r, i) => {
          const active = selected?.type === "robot" && selected.id === r.id;
          const stale = staleLevel(nowSec, r.lastHeardSec);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected({ type: "robot", id: r.id })}
              className={`focus-ring relative flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-full border ${active ? "border-life" : "border-line"} bg-black/35 backdrop-blur`}
              aria-label={`${i + 1} ${r.callsign}`}
            >
              <span className={`absolute inset-1 rounded-full border ${r.radio === "lost" ? "border-faint" : "border-mesh breathe"}`} />
              <span className="relative text-center">
                <span className="mono block text-[9px] text-faint">{i + 1}</span>
                <span className="mono block text-[10px]">{r.callsign.split("-")[0]}</span>
                <span className="mono block text-[8px] text-hazard">{stale === "live" ? "live" : formatAge(nowSec, r.lastHeardSec)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <aside id="triage" className="absolute right-4 top-24 z-20 hidden w-[250px] flex-col gap-2 md:flex">
        {triage.slice(0, 7).map((d) => {
          const active = selected?.type === "discovery" && selected.id === d.id;
          const stripe =
            d.kind === "survivor" ? "#ff4e1a" : d.kind === "hazard" ? "#f5c518" : d.kind === "blocked" ? "#e35d4a" : "#3f6b62";
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelected({ type: "discovery", id: d.id })}
              className={`ticket focus-ring w-full px-3 py-2.5 text-left ${active ? "rotate-[-1.2deg]" : "rotate-[0.4deg]"}`}
              style={{ borderLeft: `7px solid ${stripe}` }}
            >
              <div className="flex justify-between font-medium tracking-[0.14em] text-[9px] uppercase">
                <span>
                  {d.kind}
                  {d.priority ? ` · P${d.priority}` : ""}
                </span>
                <span>{pct(d.confidence)}</span>
              </div>
              <div className="mt-1 text-[13px] leading-snug">{d.title}</div>
              <div className="mono mt-1 text-[9px] opacity-60">{formatAge(nowSec, d.lastUpdateSec)}</div>
            </button>
          );
        })}
      </aside>

      <div className="absolute bottom-5 left-5 right-4 z-20 md:left-56 md:right-[270px]">
        <div className="ticket max-h-[36vh] overflow-auto scroll-thin p-4 md:p-5">
          {selectedDiscovery ? (
            <DiscoveryInspector d={selectedDiscovery} nowSec={nowSec} robots={robots} onAssign={assign} />
          ) : selectedRobot ? (
            <RobotInspector r={selectedRobot} nowSec={nowSec} queue={queue} />
          ) : selectedBuilding ? (
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.18em] opacity-50">Structure</p>
              <h2 className="serif mt-1 text-3xl text-paper-ink">{selectedBuilding.name}</h2>
              <p className="mt-2 text-sm leading-6 opacity-70">
                {selectedBuilding.knowledge} · {selectedBuilding.damage}. Unknown is not empty — it is a refusal to
                pretend we have a floorplan.
              </p>
            </div>
          ) : (
            <p className="text-sm opacity-70">Touch a voice, a robot, or a building. Space pauses the clock.</p>
          )}
          {queue.length ? (
            <p className="mt-3 border-t border-black/10 pt-2 text-[12px]">
              Held in the dark: {queue.map((q) => q.label).join(" · ")}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] opacity-50">
            <span>
              <kbd>1</kbd>–<kbd>6</kbd> · <kbd>space</kbd> · <kbd>esc</kbd>
            </span>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showUnknown} onChange={(e) => setShowUnknown(e.target.checked)} />
              unheard
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showMesh} onChange={(e) => setShowMesh(e.target.checked)} />
              mesh
            </label>
            <Link href="/process" className="underline-offset-4 hover:underline">
              Why this picture
            </Link>
          </div>
        </div>
      </div>

      {conflict && !conflict.resolved ? (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/45 p-4 md:items-center">
          <div role="dialog" aria-labelledby="conflict-title" className="ticket w-full max-w-lg p-6">
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-[#9a7b12]">Two echoes, one street</p>
            <h2 id="conflict-title" className="serif mt-1 text-3xl text-paper-ink">
              {conflict.title}
            </h2>
            <p className="mt-3 text-sm leading-6 opacity-75">{conflict.detail}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="border border-black/10 px-3 py-2">
                <span className="mono text-[10px]">Aerial</span>
                <div>{conflict.aerial}</div>
              </li>
              <li className="border border-black/10 px-3 py-2">
                <span className="mono text-[10px]">Ground</span>
                <div>{conflict.ground}</div>
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="focus-ring bg-paper-ink px-3 py-2 text-sm text-paper" onClick={() => resolveConflict("aerial")}>
                Trust newer aerial
              </button>
              <button type="button" className="focus-ring border border-black/20 px-3 py-2 text-sm" onClick={() => resolveConflict("ground")}>
                Trust closer ground
              </button>
              <button type="button" className="focus-ring border border-black/20 px-3 py-2 text-sm" onClick={() => resolveConflict("contested")}>
                Keep both
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tour ? (
        <div className="ticket absolute left-5 top-24 z-20 w-[min(100%,280px)] rotate-[-1.5deg] p-4 text-sm leading-6">
          <p className="mono text-[10px] uppercase tracking-[0.16em] opacity-50">Field note</p>
          <p className="mt-2 text-paper-ink">
            Stone is walked. Ghost line is guessed. Copper rings are the last time a robot spoke. Ember is a voice.
          </p>
          <p className="mt-2 opacity-70">Jump the clock. When the mesh dies, task MOLE anyway — the order waits.</p>
          <button type="button" className="mt-3 text-xs uppercase tracking-[0.16em] text-life" onClick={() => setTour(false)}>
            Pocket this
          </button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-36 left-5 z-20 flex w-[min(100%,300px)] flex-col gap-2 md:bottom-28">
        {toasts.map((t) => (
          <div key={t.id} className="ticket pointer-events-auto px-3 py-2 text-sm" style={{ borderLeft: `6px solid ${t.tone === "life" ? "#ff4e1a" : t.tone === "warn" ? "#f5c518" : "#3f6b62"}` }}>
            <div className="font-medium">{t.title}</div>
            <div className="opacity-70">{t.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommsPill({ state }: { state: CommsState }) {
  const label = state === "nominal" ? "Hearing" : state === "degraded" ? "Deaf spots" : "Echo returning";
  const color = state === "nominal" ? "bg-mesh" : "bg-hazard";
  return (
    <div className="flex items-center gap-2 border border-line bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.16em] backdrop-blur">
      <span className={`h-1.5 w-1.5 rounded-full ${color} ${state === "nominal" ? "breathe" : ""}`} />
      {label}
    </div>
  );
}

function DiscoveryInspector({
  d,
  nowSec,
  robots,
  onAssign,
}: {
  d: Discovery;
  nowSec: number;
  robots: Robot[];
  onAssign: (r: Robot, d: Discovery) => void;
}) {
  const recs = recommendFor(d, robots);
  return (
    <div className="text-paper-ink">
      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[#c2410c]">
        {d.kind}
        {d.people ? ` · ${d.people} ${d.people === 1 ? "person" : "people"}` : ""}
        {d.priority ? ` · P${d.priority}` : ""}
      </p>
      <h2 className="serif mt-1 text-3xl md:text-[2.4rem]">{d.title}</h2>
      <p className="mt-2 text-sm leading-6 opacity-75">{d.detail}</p>
      {d.staleWarning ? (
        <p className="mt-2 border-l-2 border-[#9a7b12] pl-3 text-sm leading-6">{d.staleWarning}</p>
      ) : null}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <Info k="Confidence" v={pct(d.confidence)} />
        <Info k="Last echo" v={formatAge(nowSec, d.lastUpdateSec)} />
        <Info k="Access" v={d.access ?? "—"} />
        <Info k="Status" v={d.status} />
      </dl>
      {d.kind === "survivor" || d.kind === "route" ? (
        <div className="mt-4">
          <p className="mono text-[10px] uppercase tracking-[0.16em] opacity-50">Who can actually reach this</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {recs.slice(0, 4).map((rec) => (
              <li key={rec.robot.id} className="border border-black/10 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="mono text-xs">{rec.robot.callsign}</span>
                  <span className="text-[11px] opacity-60">path {pct(rec.pathConfidence)}</span>
                </div>
                <p className="mt-1 text-[12px] leading-5 opacity-70">{rec.why[0]}</p>
                {rec.caution ? <p className="mt-1 text-[12px] text-[#9a7b12]">{rec.caution}</p> : null}
                <button
                  type="button"
                  className="focus-ring mt-2 text-[11px] uppercase tracking-[0.14em] text-[#c2410c]"
                  onClick={() => onAssign(rec.robot, d)}
                >
                  Task · ~{rec.etaMin} min
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function RobotInspector({ r, nowSec, queue }: { r: Robot; nowSec: number; queue: QueuedCommand[] }) {
  const held = queue.filter((q) => q.robotId === r.id);
  return (
    <div className="text-paper-ink">
      <p className="mono text-[10px] uppercase tracking-[0.18em] opacity-50">
        {r.callsign} · {r.class} · {r.radio}
      </p>
      <h2 className="serif mt-1 text-3xl">{r.role}</h2>
      <p className="mt-2 text-sm leading-6 opacity-75">{r.notes}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <Info k="Last heard" v={formatAge(nowSec, r.lastHeardSec)} />
        <Info k="Battery" v={`${r.battery}%`} />
        <Info k="Status" v={r.status} />
        <Info k="Payload" v={r.payload.join(" · ")} />
      </dl>
      {r.radio === "lost" ? (
        <p className="mt-2 text-sm text-[#9a7b12]">Ghost pose. Tasking still works — the order sits on RELAY.</p>
      ) : null}
      {held.length ? <p className="mt-2 text-sm opacity-70">{held.length} held order(s).</p> : null}
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="mono text-[9px] uppercase tracking-[0.16em] opacity-45">{k}</dt>
      <dd className="mt-0.5 text-[13px]">{v}</dd>
    </div>
  );
}
