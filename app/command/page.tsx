import Link from "next/link";
import { CommandApp } from "@/components/command-app";

export default function CommandPage() {
  return (
    <>
      <h1 className="sr-only">ECHO command picture</h1>
      <CommandApp />
      <Link href="/" className="sr-only">
        Back to briefing
      </Link>
    </>
  );
}
