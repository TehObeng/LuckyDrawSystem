"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="panel-strong max-w-2xl space-y-5 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-300">Application error</p>
        <h1 className="text-4xl font-semibold text-slate-50">The workspace hit an unexpected problem.</h1>
        <p className="text-slate-400">{error.message || "Something went wrong while rendering this page."}</p>
        <div className="flex justify-center gap-3">
          <Button type="button" onClick={reset}>
            Try Again
          </Button>
          <Button asChild variant="secondary">
            <a href="/admin">Back to Admin</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
