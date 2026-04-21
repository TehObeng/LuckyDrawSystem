"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

interface EventOption {
  id: string;
  name: string;
}

export function EventSwitcher({ events, value }: { events: EventOption[]; value?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedValue = value ?? searchParams.get("event") ?? "";

  return (
    <Select
      aria-label="Selected event"
      className="min-w-[220px]"
      value={selectedValue}
      onChange={(event) => {
        const next = new URLSearchParams(searchParams.toString());
        if (event.target.value) {
          next.set("event", event.target.value);
        } else {
          next.delete("event");
        }

        const href = (next.toString() ? `${pathname}?${next.toString()}` : pathname) as Route;
        router.push(href);
      }}
    >
      {events.length === 0 ? <option value="">Create an event first</option> : null}
      {events.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </Select>
  );
}
