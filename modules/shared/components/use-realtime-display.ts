"use client";

import { useEffect, useState } from "react";
import type { DisplayPayload } from "@/modules/shared/types/contracts";

export function useRealtimeDisplay<T extends DisplayPayload>(
  moduleType: T["moduleType"],
  eventSlug: string,
  initialState: T,
) {
  const [state, setState] = useState<T>(initialState);

  useEffect(() => {
    const source = new EventSource("/api/realtime/stream");
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as DisplayPayload;
      if (payload.moduleType === moduleType && payload.eventSlug === eventSlug) {
        setState(payload as T);
      }
    };

    return () => source.close();
  }, [moduleType, eventSlug]);

  return state;
}
