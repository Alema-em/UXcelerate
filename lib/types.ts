export type Knowledge = "confirmed" | "inferred" | "unknown";
export type Damage = "intact" | "partial" | "collapsed" | "unknown";
export type Radio = "strong" | "weak" | "lost";
export type RobotClass = "uav" | "crawler" | "acoustic" | "heavy" | "snake" | "relay";
export type RobotStatus = "mapping" | "searching" | "tasked" | "silent" | "relaying" | "queued";
export type DiscoveryKind = "survivor" | "hazard" | "blocked" | "route";
export type DiscoveryStatus = "new" | "acknowledged" | "assigned" | "contested" | "resolved";
export type CommsState = "nominal" | "degraded" | "restoring";
export type Selection =
  | { type: "robot"; id: string }
  | { type: "discovery"; id: string }
  | { type: "building"; id: string }
  | null;

export type Building = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  d: string;
  hole?: string;
  cx: number;
  cy: number;
  kind: "housing" | "hospital" | "school" | "market" | "parking" | "industrial" | "civic";
  knowledge: Knowledge;
  damage: Damage;
};

export type Street = {
  id: string;
  name: string;
  d: string;
  knowledge: Knowledge;
  blocked?: boolean;
};

export type Robot = {
  id: string;
  callsign: string;
  class: RobotClass;
  role: string;
  x: number;
  y: number;
  heading: number;
  battery: number;
  lastHeardSec: number;
  radio: Radio;
  status: RobotStatus;
  payload: string[];
  can: string[];
  notes: string;
};

export type Discovery = {
  id: string;
  kind: DiscoveryKind;
  x: number;
  y: number;
  title: string;
  detail: string;
  confidence: number;
  lastUpdateSec: number;
  sourceRobot: string;
  priority?: 1 | 2 | 3;
  people?: number;
  access?: string;
  status: DiscoveryStatus;
  assignedRobot?: string;
  staleWarning?: string;
};

export type Conflict = {
  id: string;
  title: string;
  detail: string;
  x: number;
  y: number;
  aerial: string;
  ground: string;
  resolved?: "aerial" | "ground" | "contested";
};

export type QueuedCommand = {
  id: string;
  robotId: string;
  label: string;
  createdSec: number;
};

export type SimEvent =
  | { at: number; type: "route"; discovery: Discovery }
  | { at: number; type: "survivor"; discovery: Discovery }
  | { at: number; type: "hazard"; discovery: Discovery }
  | { at: number; type: "confidence"; discoveryId: string; confidence: number; detail: string }
  | { at: number; type: "comms"; state: CommsState; lost: string[]; note: string }
  | { at: number; type: "conflict"; conflict: Conflict }
  | { at: number; type: "aftershock"; note: string }
  | { at: number; type: "restore"; robotId: string; dump: string };

export type Toast = {
  id: string;
  title: string;
  body: string;
  tone: "life" | "warn" | "mesh" | "ok";
};
