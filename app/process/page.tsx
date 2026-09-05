import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/mark";

export const metadata: Metadata = {
  title: "ECHO — Design case",
  description: "How ECHO was designed for incomplete maps, dropped radios, and continuous discovery.",
};

export default function ProcessPage() {
  return (
    <div className="grain min-h-dvh bg-bg text-ink">
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="focus-ring flex items-center gap-2 rounded-sm">
            <Mark className="h-6 w-6" />
            <span className="text-sm tracking-[0.22em]">ECHO</span>
          </Link>
          <Link href="/command" className="text-sm text-life">
            Open prototype →
          </Link>
        </header>

        <article className="py-16">
          <p className="mono text-[11px] uppercase tracking-[0.22em] text-mesh">Design case · UXcelerate 2026</p>
          <h1 className="serif mt-4 text-5xl leading-tight md:text-6xl">Design for the echo, not the live feed.</h1>
          <p className="mt-6 text-lg leading-8 text-muted">
            The brief is not “draw a map and put robots on it.” It is to coordinate machines in a city that no
            longer matches any map, over a radio that will lie by omission. ECHO is built around that gap.
          </p>

          <Section n="01" title="Who is under the headset">
            <p>
              The primary user is a field incident commander at a mobile post: tablet or laptop, gloves optional,
              noise, dust, aftershocks, and a mix of UAV, crawler, snake, heavy, and relay robots. They are not a
              tele-operator for one machine. They are a dispatcher of scarce, semi-autonomous bodies.
            </p>
            <p className="mt-4">
              Domain research, not a fiction interview: Casper &amp; Murphy’s study of robots at the World Trade
              Center found operators drowning in windows, losing situation awareness, and fighting lighting, dust,
              and dropped comms. DARPA Subterranean Challenge interfaces that won did the opposite — fewer panes,
              a common picture, and honest localization. FEMA US&amp;R and INSARAG doctrine already triage people
              as P1/P2/P3. We stole that, not a notification inbox.
            </p>
          </Section>

          <Section n="02" title="The three constraints, made visible">
            <p>
              Incomplete maps become a visual language: confirmed footprints are solid, inferred dashed, unknown
              hatched. Empty dark space would look like “nothing there.” Hatch says “we have not earned this tile.”
            </p>
            <p className="mt-4">
              Unreliable comms become age. Every robot and every life signal carries last-heard. At fifteen seconds
              it is live. At a minute it is aging. At four minutes it is a ghost pose. When the mesh degrades, the
              chrome says <em>last-known picture</em> and orders queue on the relay mule instead of throwing errors.
            </p>
            <p className="mt-4">
              Continuous discovery becomes a single triage column. Survivors first, then hazards that kill them,
              then blocked streets, then new routes. A feed of “robot battery 64%” never outranks a child who
              answered a knock.
            </p>
          </Section>

          <Section n="03" title="Decisions that look like product">
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <strong className="text-ink">Tasking scores the path, not the pin.</strong> The nearest robot is
                useless if it cannot hear you or if the street to the balcony is a guess. Recommendations show path
                confidence, radio, and body type.
              </li>
              <li>
                <strong className="text-ink">Conflict is a first-class object.</strong> Aerial and ground will
                disagree. Operators may trust newer, trust closer, or keep the street contested. Pretending the map
                is single-valued is how people die in a gap that “looked open.”
              </li>
              <li>
                <strong className="text-ink">Silence does not delete intent.</strong> A command to a dark crawler is
                held. When RELAY hears MOLE again, the dump includes both telemetry and the order you already gave.
              </li>
              <li>
                <strong className="text-ink">Human warmth vs machine teal.</strong> Life is peach, not siren red.
                Robots are dusty teal. Hazards are gold with shape, not color alone. The serif is reserved for
                people and places; mono is for clocks and callsigns.
              </li>
            </ul>
          </Section>

          <Section n="04" title="What we refused">
            <p>
              A wall of camera tiles. A game-like minimap with perfect fog-of-war that fills in like Warcraft. A
              chatbot. Red/green status that fails in dust and for color-blind operators. Tele-op joysticks for six
              robots at once — that is how DARPA teams lost minutes. ECHO assumes robots search; humans prioritize.
            </p>
          </Section>

          <Section n="05" title="Accessibility in a disaster, not a lab">
            <ul className="list-disc space-y-3 pl-5">
              <li>WCAG-oriented contrast on warm off-white against near-black. Focus rings on every control.</li>
              <li>Kind is encoded with shape + label + color: peach disc (life), gold triangle (hazard), diamond (block), cross (route).</li>
              <li>Assertive live region announces new survivors and mesh failure. Keyboard: 1–6 robots, space pauses, escape clears.</li>
              <li>Motion (aftershock tremor, pulse rings) respects reduced-motion.</li>
              <li>Hit targets stay large; the prototype is a command post picture, not a watch face.</li>
            </ul>
          </Section>

          <Section n="06" title="How to walk the prototype">
            <ol className="list-decimal space-y-3 pl-5">
              <li>Open the live picture. Read the hatch. The northeast is unmapped on purpose.</li>
              <li>Select the peach marker on Harbor House A. Assign THREAD or WHISPER. Watch path confidence.</li>
              <li>Wait ~32s (or watch toasts). Mesh degrades. Try tasking MOLE — the order queues.</li>
              <li>At ~45s, resolve the Harbor Street conflict. Keeping both is a valid, safer answer.</li>
              <li>At ~96s, MOLE becomes an echo again. The stale tapping upgrades to two rhythms.</li>
            </ol>
            <Link
              href="/command"
              className="mt-8 inline-flex bg-life px-5 py-3 text-sm font-medium text-[#1a120c]"
            >
              Enter Sector 4
            </Link>
          </Section>
        </article>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-16 border-t border-line pt-10">
      <p className="mono text-[11px] uppercase tracking-[0.2em] text-faint">{n}</p>
      <h2 className="serif mt-2 text-3xl">{title}</h2>
      <div className="mt-4 text-[16px] leading-7 text-muted">{children}</div>
    </section>
  );
}
