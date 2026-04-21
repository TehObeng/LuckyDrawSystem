"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel-strong space-y-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-300">Admin error</p>
      <h1 className="text-3xl font-semibold text-slate-50">This admin page could not finish loading.</h1>
      <p className="text-slate-400">{error.message || "Check the selected event, current route, or backing service state and try again."}</p>
      <div className="flex gap-3">
        <Button type="button" onClick={reset}>
          Retry
        </Button>
        <Button asChild variant="secondary">
          <a href="/admin">Back to Overview</a>
        </Button>
      </div>
    </div>
  );
}
