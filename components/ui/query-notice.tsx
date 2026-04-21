"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function QueryNotice({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const notice = searchParams.get("notice");
  const message = error ?? notice;

  if (!message) {
    return null;
  }

  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.delete("error");
  nextParams.delete("notice");
  const dismissHref = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
  const isError = Boolean(error);
  const Icon = isError ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-[1.4rem] border px-4 py-4 text-sm shadow-[0_18px_48px_rgba(2,6,23,0.2)]",
        isError ? "border-rose-300/30 bg-rose-400/10 text-rose-50" : "border-emerald-300/25 bg-emerald-300/10 text-emerald-50",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <p>{message}</p>
      </div>
      <a
        href={dismissHref}
        className="rounded-full border border-white/10 p-1 text-white/70 transition hover:border-white/20 hover:text-white"
        aria-label="Dismiss message"
      >
        <X className="size-4" />
      </a>
    </div>
  );
}
