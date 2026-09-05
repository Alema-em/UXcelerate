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
    <div className="grain flex h-dvh flex-col bg-bg text-ink">
      <a href="#triage" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-bg-2 focus:p-3">
        Skip to triage
      </a>
      <div aria-live="assertive" className="sr-only">
        {live}
      </div>

      <header className="relative z-10 flex items-center gap-4 border-b border-line px-4 py-2.5">
        <Link href="/" className="focus-ring flex items-center gap-2 rounded-md">
          <Mark className="h-6 w-6" />
          <span className="text-sm tracking-[0.2em]">ECHO</span>
        </Link>
        <span className="hidden text-muted sm:inline">/</span>
        <div className="hidden min-w-0 sm:block">
          <div className="truncate text-sm">{INCIDENT.place}</div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-faint">
            {INCIDENT.name} · magnitude {INCIDENT.magnitude}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Stat label="Picture" value={pct(known)} hint="of map confirmed or inferred" />
          <Stat label="Lives on board" value={String(people)} hint={`${lives.length} signals`} />
          <Stat label="Mission" value={formatMissionClock(nowSec)} hint={paused ? "paused" : "running"} />
          <CommsPill state={comms} />
          <label className="hidden items-center gap-2 text-[11px] text-muted lg:flex">
            Jump
            <select
              className="focus-ring max-w-[140px] border border-line bg-bg px-2 py-1"
              value=""
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v > elapsed) setElapsed(v);
                e.target.value = "";
              }}
              aria-label="Jump incident clock to a designed moment"
            >
              <option value="">moments</option>
              <option value="32">Mesh dies</option>
              <option value="45">Street conflict</option>
              <option value="72">Aftershock</option>
              <option value="96">MOLE returns</option>
            </select>
          </label>
          <button
            type="button"
            className="focus-ring rounded-md border border-line px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      {comms !== "nominal" ? (
        <div
          role="status"
          className="relative z-10 flex items-center justify-between gap-3 border-b border-hazard/30 bg-hazard/10 px-4 py-2 text-sm"
        >
          <p>
            <span className="mono mr-2 text-[11px] uppercase tracking-[0.16em] text-hazard">
              {comms === "degraded" ? "Last-known picture" : "Mesh restoring"}
            </span>
            Silent robots keep their last pose. Orders to them queue on RELAY instead of failing.
          </p>
          <span className="mono text-[11px] text-muted">{queue.length} queued</span>
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-0 flex-1">
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-line lg:flex">
          <div className="px-3 py-2 mono text-[10px] uppercase tracking-[0.18em] text-faint">Fleet 1–6</div>
          <ul className="flex-1 overflow-auto scroll-thin">
            {robots.map((r, i) => {
              const active = selected?.type === "robot" && selected.id === r.id;
              const stale = staleLevel(nowSec, r.lastHeardSec);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected({ type: "robot", id: r.id })}
                    className={`focus-ring flex w-full items-start gap-2 border-b border-line px-3 py-2.5 text-left ${active ? "bg-bg-3" : "hover:bg-bg-2"}`}
                  >
                    <span className="mono text-[10px] text-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="mono text-xs text-mesh">{r.callsign}</span>
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${r.radio === "lost" ? "bg-muted" : r.radio === "weak" ? "bg-hazard" : "bg-mesh breathe"}`}
                        />
                      </span>
                      <span className="block truncate text-[11px] text-muted">{r.role}</span>
                      <span className="mono text-[10px] text-faint">
                        {stale === "live" ? "live" : formatAge(nowSec, r.lastHeardSec)} · {r.battery}%
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-1 border-t border-line p-3 text-[11px] text-muted">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showUnknown} onChange={(e) => setShowUnknown(e.target.checked)} />
              Unknown hatch
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showMesh} onChange={(e) => setShowMesh(e.target.checked)} />
              Mesh links
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showLastKnown} onChange={(e) => setShowLastKnown(e.target.checked)} />
              Last-known ghosts
            </label>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1">
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
        </main>

        <aside id="triage" className="hidden w-[300px] shrink-0 flex-col border-l border-line bg-bg/80 md:flex">
          <div className="px-3 py-2 mono text-[10px] uppercase tracking-[0.18em] text-faint">
            Triage · lives first
          </div>
          <ul className="flex-1 overflow-auto scroll-thin">
            {triage.map((d) => {
              const active = selected?.type === "discovery" && selected.id === d.id;
              const tone =
                d.kind === "survivor" ? "text-life" : d.kind === "hazard" ? "text-hazard" : d.kind === "blocked" ? "text-block" : "text-route";
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelected({ type: "discovery", id: d.id })}
                    className={`focus-ring w-full border-b border-line px-3 py-3 text-left ${active ? "bg-bg-3" : "hover:bg-bg-2"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`mono text-[10px] uppercase tracking-[0.14em] ${tone}`}>
                        {d.kind}
                        {d.priority ? ` · P${d.priority}` : ""}
                      </span>
                      <span className="mono text-[10px] text-faint">{pct(d.confidence)}</span>
                    </div>
                    <div className="mt-1 text-sm leading-snug">{d.title}</div>
                    <div className="mt-1 mono text-[10px] text-muted">
                      {formatAge(nowSec, d.lastUpdateSec)}
                      {d.assignedRobot ? " · tasked" : ""}
                      {d.status === "contested" ? " · contested" : ""}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-line px-3 py-2 md:hidden scroll-thin" role="list">
        {triage.map((d) => (
          <button
            key={d.id}
            type="button"
            role="listitem"
            onClick={() => setSelected({ type: "discovery", id: d.id })}
            className={`focus-ring shrink-0 border px-2 py-1 text-[11px] ${selected?.type === "discovery" && selected.id === d.id ? "border-life text-life" : "border-line text-muted"}`}
          >
            {d.kind === "survivor" ? d.title.split(",")[0] : d.kind}
          </button>
        ))}
      </div>
      <section className="relative z-10 grid max-h-[42vh] grid-cols-1 border-t border-line md:grid-cols-[1fr_280px]">
        <div className="min-h-0 overflow-auto scroll-thin p-4">
          {selectedDiscovery ? (
            <DiscoveryInspector
              d={selectedDiscovery}
              nowSec={nowSec}
              robots={robots}
              onAssign={assign}
            />
          ) : selectedRobot ? (
            <RobotInspector r={selectedRobot} nowSec={nowSec} queue={queue} />
          ) : selectedBuilding ? (
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.16em] text-faint">Structure</p>
              <h2 className="serif mt-1 text-3xl">{selectedBuilding.name}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Knowledge: {selectedBuilding.knowledge}. Damage: {selectedBuilding.damage}. Unknown is not empty —
                it is a refusal to pretend we have a floorplan.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">Select a robot, a life signal, or a building. Space pauses the incident clock.</p>
          )}
        </div>
        <div className="border-t border-line p-4 md:border-l md:border-t-0">
          <p className="mono text-[10px] uppercase tracking-[0.16em] text-faint">Queued while dark</p>
          {queue.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No held orders. If a radio dies, intent waits here instead of vanishing.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {queue.map((q) => (
                <li key={q.id} className="border border-line px-2 py-1.5">
                  {q.label}
                  <div className="mono text-[10px] text-faint">{formatAge(nowSec, q.createdSec)}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[11px] leading-5 text-faint">
            <kbd>1</kbd>–<kbd>6</kbd> robots · <kbd>space</kbd> pause · <kbd>esc</kbd> clear
          </p>
          <Link href="/process" className="mt-3 inline-block text-[12px] text-mesh underline-offset-4 hover:underline">
            Why the picture looks like this
          </Link>
        </div>
      </section>

      {conflict && !conflict.resolved ? (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div role="dialog" aria-labelledby="conflict-title" className="panel w-full max-w-lg p-5">
            <p className="mono text-[10px] uppercase tracking-[0.16em] text-hazard">Two echoes, one street</p>
            <h2 id="conflict-title" className="serif mt-1 text-3xl">
              {conflict.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">{conflict.detail}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="border border-line px-3 py-2">
                <span className="mono text-[10px] text-mesh">Aerial</span>
                <div>{conflict.aerial}</div>
              </li>
              <li className="border border-line px-3 py-2">
                <span className="mono text-[10px] text-life">Ground</span>
                <div>{conflict.ground}</div>
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="focus-ring border border-mesh px-3 py-2 text-sm" onClick={() => resolveConflict("aerial")}>
                Trust newer aerial
              </button>
              <button type="button" className="focus-ring border border-line px-3 py-2 text-sm" onClick={() => resolveConflict("ground")}>
                Trust closer ground
              </button>
              <button type="button" className="focus-ring border border-hazard/50 px-3 py-2 text-sm" onClick={() => resolveConflict("contested")}>
                Keep both · contested
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tour ? (
        <div className="absolute right-4 top-16 z-20 w-[min(100%,320px)] panel p-4 text-sm leading-6">
          <p className="mono text-[10px] uppercase tracking-[0.16em] text-mesh">For judges · 20 seconds</p>
          <p className="mt-2">
            Only part of this picture is confirmed. Watch the clock. A route will appear, then the mesh will fail, then two robots will disagree about a street.
          </p>
          <p className="mt-2 text-muted">Open a peach life marker. Assign a robot. If they cannot hear you, the order waits.</p>
          <button type="button" className="focus-ring mt-3 text-xs uppercase tracking-[0.14em] text-life" onClick={() => setTour(false)}>
            Close
          </button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-28 left-4 z-20 flex w-[min(100%,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto border border-line bg-bg-2/95 px-3 py-2 text-sm backdrop-blur"
            style={{ borderLeftColor: t.tone === "life" ? "var(--life)" : t.tone === "warn" ? "var(--hazard)" : "var(--mesh)", borderLeftWidth: 3 }}
          >
            <div className="text-ink">{t.title}</div>
            <div className="text-muted">{t.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="hidden text-right lg:block">
      <div className="mono text-[10px] uppercase tracking-[0.16em] text-faint">{label}</div>
      <div className="font-medium leading-tight">{value}</div>
      <div className="text-[10px] text-muted">{hint}</div>
    </div>
  );
}

function CommsPill({ state }: { state: CommsState }) {
  const label = state === "nominal" ? "Mesh nominal" : state === "degraded" ? "Mesh degraded" : "Mesh restoring";
  const color = state === "nominal" ? "bg-mesh" : "bg-hazard";
  return (
    <div className="flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[11px] uppercase tracking-[0.14em]">
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
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.16em] text-life">
        {d.kind}
        {d.people ? ` · ${d.people} ${d.people === 1 ? "person" : "people"}` : ""}
        {d.priority ? ` · P${d.priority}` : ""}
      </p>
      <h2 className="serif mt-1 text-3xl md:text-4xl">{d.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{d.detail}</p>
      {d.staleWarning ? (
        <p className="mt-3 max-w-2xl border-l-2 border-hazard pl-3 text-sm leading-6 text-warn">{d.staleWarning}</p>
      ) : null}
      <dl className="mt-4 grid max-w-2xl grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Info k="Confidence" v={pct(d.confidence)} />
        <Info k="Last echo" v={formatAge(nowSec, d.lastUpdateSec)} />
        <Info k="Access" v={d.access ?? "—"} />
        <Info k="Status" v={d.status} />
      </dl>
      {d.kind === "survivor" || d.kind === "route" ? (
        <div className="mt-5">
          <p className="mono text-[10px] uppercase tracking-[0.16em] text-faint">Who can actually reach this</p>
          <ul className="mt-2 grid gap-2 md:grid-cols-2">
            {recs.slice(0, 4).map((rec) => (
              <li key={rec.robot.id} className="border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className="mono text-xs text-mesh">{rec.robot.callsign}</span>
                  <span className="text-[11px] text-muted">path {pct(rec.pathConfidence)}</span>
                </div>
                <p className="mt-1 text-[12px] leading-5 text-muted">{rec.why[0]}</p>
                {rec.caution ? <p className="mt-1 text-[12px] text-hazard">{rec.caution}</p> : null}
                <button
                  type="button"
                  className="focus-ring mt-2 text-[12px] uppercase tracking-[0.12em] text-life"
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
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.16em] text-mesh">
        {r.callsign} · {r.class} · {r.radio}
      </p>
      <h2 className="serif mt-1 text-3xl md:text-4xl">{r.role}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{r.notes}</p>
      <dl className="mt-4 grid max-w-2xl grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Info k="Last heard" v={formatAge(nowSec, r.lastHeardSec)} />
        <Info k="Battery" v={`${r.battery}%`} />
        <Info k="Status" v={r.status} />
        <Info k="Payload" v={r.payload.join(" · ")} />
      </dl>
      {r.radio === "lost" ? (
        <p className="mt-3 max-w-2xl text-sm text-hazard">
          This is a ghost pose. Tasking still works — the order sits on RELAY until an echo comes back.
        </p>
      ) : null}
      {held.length ? <p className="mt-2 text-sm text-muted">{held.length} held order(s) waiting for radio.</p> : null}
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="mono text-[10px] uppercase tracking-[0.14em] text-faint">{k}</dt>
      <dd className="mt-1">{v}</dd>
    </div>
  );
}
