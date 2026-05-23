"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, Boxes, Bug, Gauge, Gavel, Home, Paintbrush, ScrollText, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview", icon: Home },
  { href: "/admin/events", label: "Events", icon: Boxes },
  { href: "/admin/themes", label: "Themes", icon: Paintbrush },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
  { href: "/admin/lucky-draw", label: "Lucky Draw", icon: Sparkles },
  { href: "/admin/simple-lucky-draw", label: "Simple Draw", icon: Activity },
  { href: "/admin/auction", label: "Auction", icon: Gavel },
  { href: "/admin/imports", label: "Imports", icon: Gauge },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
  { href: "/admin/live", label: "Live Control", icon: Activity },
  { href: "/admin/debug", label: "Debug", icon: Bug },
];

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const href = (eventId ? `${item.href}?event=${eventId}` : item.href) as Route;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100",
              active && "bg-white/[0.08] text-slate-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
