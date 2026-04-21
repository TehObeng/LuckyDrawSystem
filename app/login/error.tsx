"use client";

import { Button } from "@/components/ui/button";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel-strong space-y-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-300">Login error</p>
      <h1 className="text-3xl font-semibold text-slate-50">The sign-in view hit a problem.</h1>
      <p className="text-slate-400">{error.message || "Retry the local operator session or use preview access to continue."}</p>
      <Button type="button" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
