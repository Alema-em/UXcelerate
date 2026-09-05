# ECHO

**Command interface for rescue robots when the map is a rumor and the radio is an echo.**

Submission for [UXcelerate](https://www.instagram.com/iei_bpdc/) — [IEI BPDC](https://www.instagram.com/iei_bpdc/) UI/UX challenge, 5–6 September 2026.

Fork: [github.com/Alema-em/UXcelerate](https://github.com/Alema-em/UXcelerate)

---

## Problem

Design an interface for coordinating rescue robots after an earthquake, where:

- maps may be incomplete
- communication may be unreliable
- robots continuously discover survivors, blocked paths, structural hazards, and new accessible routes

## What we built

**ECHO** is a field command picture — not a robot video wall, not a dashboard of batteries.

It treats three things as first-class UX:

1. **Unknown geography** — confirmed, inferred, and unmapped tiles are different materials. Fog is hatched so it cannot be mistaken for empty.
2. **Stale truth** — every pose and every life signal has an age. When the mesh dies, the UI says *last-known picture* and **queues orders** instead of failing.
3. **Triage, not notifications** — survivors first, then the hazards that kill them, then blocked streets, then new routes.

The live prototype is a scripted incident (**Op Halcyon**, Sector 4, T+47 minutes) with six robots. The clock runs. Discoveries arrive. Radios drop. Aerial and ground disagree about a street. A silent crawler speaks again.

## Walk the prototype (judges)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

1. Read the briefing, then **Open the command picture**.
2. Select the peach life marker on Harbor House A. Assign a robot. Path confidence is part of the order.
3. Use **Jump → moments** in the header if you do not want to wait:
   - **Mesh dies** — last-known mode, orders to dark robots queue
   - **Street conflict** — trust aerial, trust ground, or keep both
   - **Aftershock** — inferred tiles become guesses again
   - **MOLE returns** — store-and-forward dump, queued orders flush
4. Keyboard: `1–6` robots, `space` pause, `esc` clear selection.
5. The written case is at `/process`.

## Design notes

Full rationale lives in the app at **`/process`**. Short version:

- Domain: Casper & Murphy (WTC robot response), DARPA SubT operator interfaces, FEMA/INSARAG triage.
- Color is never the only code: peach disc = life, gold triangle = hazard, diamond = block, cross = route. Robots are teal chevrons.
- Accessibility: focus rings, live region, reduced-motion, large field-post targets, skip link.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · no map vendor, so the *uncertainty* is the map.

## Competition links

- Official Instagram: [iei_bpdc](https://www.instagram.com/iei_bpdc/)
- Starter repo: [ieibpdc/UXcelerate](https://github.com/ieibpdc/UXcelerate)
- Submission form: [UXcelerate form](https://docs.google.com/forms/d/e/1FAIpQLSdF-HbTXtL_Qk098nPxq8cwys_6ANyRC2fb8I2SQCcYy4XXuQ/viewform?usp=publish-editor)
