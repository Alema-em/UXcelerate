import Link from "next/link";
import { Mark } from "@/components/mark";

export default function Home() {
  return (
    <div className="grain min-h-dvh bg-bg text-ink">
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mark />
            <span className="text-sm tracking-[0.22em]">ECHO</span>
          </div>
          <nav className="flex gap-6 text-sm text-muted">
            <Link href="/process" className="focus-ring rounded-sm hover:text-ink">
              Design case
            </Link>
            <Link href="/command" className="focus-ring rounded-sm hover:text-ink">
              Live picture
            </Link>
          </nav>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <p className="mono text-[11px] uppercase tracking-[0.22em] text-mesh">
            UXcelerate 2026 · Op Halcyon · T+00:47:00
          </p>
          <h1 className="serif mt-4 max-w-4xl text-5xl leading-[1.05] md:text-7xl">
            The map is already a rumor.
            <span className="text-life"> The people are not.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            ECHO is a command interface for rescue robots after an earthquake — when streets vanish,
            radios drop, and every new ping might be a life, a collapse, or a lie that is four minutes old.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/command"
              className="focus-ring inline-flex items-center bg-life px-5 py-3 text-sm font-medium text-[#1a120c]"
            >
              Open the command picture
            </Link>
            <Link href="/process" className="focus-ring inline-flex items-center border border-ink/25 px-5 py-3 text-sm text-ink">
              Read how we designed it
            </Link>
          </div>

          <ul className="mt-16 grid gap-4 md:grid-cols-3">
            <Constraint
              k="01"
              title="Maps are incomplete"
              body="Unknown is drawn as a material. Inferred streets are dashed. We never fill fog with fake confidence."
            />
            <Constraint
              k="02"
              title="Radios are unreliable"
              body="Every pose has an age. When the mesh dies, the picture becomes last-known, and orders queue instead of failing."
            />
            <Constraint
              k="03"
              title="Discovery never stops"
              body="Survivors, blockages, hazards, and new routes land in one triage — lives first, then the things that kill them."
            />
          </ul>
        </main>

        <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6 text-sm text-muted">
          <p>Halcyon Waterfront, Sector 4 · 6.8 Mw · 6 robots still in the dust</p>
          <p>
            For{" "}
            <a className="text-ink underline-offset-4 hover:underline" href="https://www.instagram.com/iei_bpdc/">
              IEI BPDC
            </a>
            · UXcelerate
          </p>
        </footer>
      </div>
    </div>
  );
}

function Constraint({ k, title, body }: { k: string; title: string; body: string }) {
  return (
    <li className="border border-line bg-bg-2/50 p-5">
      <p className="mono text-[11px] text-faint">{k}</p>
      <h2 className="mt-3 text-lg">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </li>
  );
}
