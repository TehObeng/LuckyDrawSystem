import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { EventSwitcher } from "@/components/admin/event-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QueryNotice } from "@/components/ui/query-notice";
import { prisma } from "@/lib/prisma";
import { getCurrentOperator } from "@/lib/auth/operator";
import { logoutAction } from "@/app/login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const operator = await getCurrentOperator();
  if (!operator) {
    redirect("/login");
  }

  const events = await prisma.event.findMany({
    where: {
      archivedAt: null,
    },
    orderBy: [{ date: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="app-shell relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.06),transparent_24%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="panel-strong flex flex-col gap-6 p-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="space-y-3">
            <Link href="/admin" className="inline-flex items-center gap-3 text-slate-50">
              <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-2 text-emerald-300">
                <MonitorSmartphone className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Stage Ops</p>
                <p className="font-semibold">Live Event Control</p>
              </div>
            </Link>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Operator</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-100">{operator.displayName}</p>
                  <p className="text-sm text-slate-400">{operator.email}</p>
                </div>
                <Badge variant={operator.role === "admin" ? "success" : "accent"}>{operator.role}</Badge>
              </div>
            </div>
          </div>

          <SidebarNav />

          <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Active Event</p>
            <EventSwitcher events={events} />
            <form action={logoutAction}>
              <Button type="submit" variant="secondary" className="w-full justify-between">
                Sign out
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 space-y-6 overflow-x-hidden py-2">
          <QueryNotice />
          {children}
        </div>
      </div>
    </div>
  );
}
