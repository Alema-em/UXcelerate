import Link from "next/link";
import { Mark } from "@/components/mark";

export default function Home() {
  return (
    <div className="paper grain min-h-dvh">
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mark />
            <span className="tracking-[0.28em] text-sm">ECHO</span>
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/process" className="focus-ring opacity-60 hover:opacity-100">
              Design case
            </Link>
            <Link href="/command" className="focus-ring opacity-60 hover:opacity-100">
              Night picture
            </Link>
          </nav>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <p className="mono text-[11px] uppercase tracking-[0.26em] text-life">
            Survey no. 4 · Halcyon waterfront · T+47m
          </p>
          <h1 className="serif mt-5 max-w-4xl text-5xl leading-[0.95] md:text-7xl">
            We do not draw the city.
            <br />
            We draw the last time it answered.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 opacity-70">
            ECHO is a night survey for rescue robots. Stone footprints are walked. Ghost lines are guesses. Copper
            rings are radios. Ember rings are people knocking.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/command" className="focus-ring bg-[#1c1612] px-6 py-3 text-sm text-[#efe6d4]">
              Open the night picture
            </Link>
            <Link href="/process" className="focus-ring border border-black/20 px-6 py-3 text-sm">
              The method
            </Link>
          </div>
        </main>

        <footer className="flex flex-wrap justify-between gap-4 border-t border-black/15 pt-6 text-sm opacity-60">
          <p>Figure-ground · last-heard rings · paper tickets</p>
          <p>
            <a className="underline-offset-4 hover:underline" href="https://www.instagram.com/iei_bpdc/">
              IEI BPDC
            </a>{" "}
            · UXcelerate 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
