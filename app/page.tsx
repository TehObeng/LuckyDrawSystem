import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, Gavel, MonitorPlay, Sparkles, Workflow } from "lucide-react";

const quickLinks = [
  {
    href: "/admin" as Route,
    title: "Operator workspace",
    copy: "Jump into event setup, live control, imports, corrections, and audit history from one authenticated surface.",
    icon: Workflow,
  },
  {
    href: "/display/lucky-draw/demo-event" as Route,
    title: "Lucky Draw output",
    copy: "Stage-ready public route for exclusive winner reveals, grid layouts, and projector or OBS capture.",
    icon: Sparkles,
  },
  {
    href: "/display/auction/demo-event" as Route,
    title: "Auction output",
    copy: "Clean live bid display with crossed-out previous price, sold and passed states, and fullscreen-safe typography.",
    icon: Gavel,
  },
];

export default function HomePage() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 grid-glow opacity-40" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,0.66))]" />

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10 xl:px-14">
        <div className="panel-strong flex flex-1 flex-col overflow-hidden p-6 sm:p-8 xl:p-10">
          <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.36em] text-emerald-300">Live Event Platform</p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl xl:text-6xl">
                Run lucky draws and auctions like a real show-control system.
              </h1>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 lg:flex lg:items-center lg:gap-2">
              <MonitorPlay className="size-4 text-emerald-300" />
              Realtime display sync
            </div>
          </div>

          <div className="grid flex-1 gap-8 pt-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-between gap-8">
              <div className="space-y-5">
                <p className="max-w-3xl text-lg leading-8 text-slate-300 xl:text-xl">
                  A modular event operations platform for stage teams. Configure branded events, split draw sessions,
                  run live bidding, publish clean fullscreen outputs, and recover safely when the room is moving fast.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Modules</p>
                    <p className="mt-3 text-2xl font-semibold text-white">Lucky Draw + Auction</p>
                  </div>
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Outputs</p>
                    <p className="mt-3 text-2xl font-semibold text-white">Projector, LED, OBS</p>
                  </div>
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Operator UX</p>
                    <p className="mt-3 text-2xl font-semibold text-white">Keyboard-first</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_34px_rgba(52,211,153,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-300"
                  href={"/admin" as Route}
                >
                  Open operator workspace
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/10"
                  href={"/login" as Route}
                >
                  Staff sign-in
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {quickLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    className="group rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-emerald-300/30 hover:bg-white/[0.06]"
                    href={link.href}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <Icon className="size-5 text-emerald-300" />
                      </div>
                      <ArrowRight className="size-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-200" />
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold text-white">{link.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-400">{link.copy}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
