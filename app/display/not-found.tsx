import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DisplayNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-center">
      <div className="panel-strong max-w-2xl space-y-5 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Display not found</p>
        <h1 className="text-4xl font-semibold text-slate-50">This public screen is not available.</h1>
        <p className="text-slate-400">The event slug or screen key may be wrong, or the event has not published that display yet.</p>
        <Button asChild>
          <Link href="/admin/live">Open Live Control</Link>
        </Button>
      </div>
    </main>
  );
}
