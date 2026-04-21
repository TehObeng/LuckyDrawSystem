"use client";

import { Button } from "@/components/ui/button";

export default function DisplayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-center">
      <div className="panel-strong max-w-2xl space-y-5 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-300">Display error</p>
        <h1 className="text-4xl font-semibold text-slate-50">The public display could not render.</h1>
        <p className="text-slate-400">{error.message || "Try reloading this screen or republishing the display state from admin."}</p>
        <Button type="button" onClick={reset}>
          Reload Display
        </Button>
      </div>
    </main>
  );
}
