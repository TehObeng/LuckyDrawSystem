"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/public-path";
import { liveDisplayEnvelopeSchema, type LiveDisplayEnvelope } from "@/modules/shared/types/contracts";

export function useRealtimeDisplay<T extends LiveDisplayEnvelope>(
  moduleType: T["moduleType"],
  eventOrScreen: string,
  initialState: T,
  pollingIntervalMs = 2500,
) {
  const [state, setState] = useState<T>(initialState);
  const latestStateRef = useRef<T>(initialState);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | null = null;
    const intervalMs = Math.min(Math.max(pollingIntervalMs, 1000), 30000);

    const applyState = (nextState: T) => {
      const current = latestStateRef.current;

      if (nextState.revision < current.revision) {
        return;
      }

      latestStateRef.current = nextState;
      setState(nextState);
    };

    async function hydrateCurrentState() {
      try {
        const response = await fetch(withBasePath(`/api/display/${moduleType}/${encodeURIComponent(eventOrScreen)}`), {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = liveDisplayEnvelopeSchema.parse(await response.json());
        if (cancelled || payload.moduleType !== moduleType) {
          return;
        }

        applyState(payload as T);
      } catch {
        // Keep the last known good state on transient failures.
      }
    }

    void hydrateCurrentState();
    pollTimer = window.setInterval(() => {
      void hydrateCurrentState();
    }, intervalMs);

    return () => {
      cancelled = true;

      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
    };
  }, [eventOrScreen, initialState.screenKey, moduleType, pollingIntervalMs]);

  return state;
}
