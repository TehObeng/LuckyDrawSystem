"use client";

import { DisplayFrame } from "@/modules/shared/components/display-frame";
import { useRealtimeDisplay } from "@/modules/shared/components/use-realtime-display";
import { LuckyDrawDisplayContent } from "@/modules/lucky-draw/components/lucky-draw-display-content";
import type { LuckyDrawDisplayEnvelope } from "@/modules/shared/types/contracts";

export function LuckyDrawDisplay({
  initialState,
  eventOrScreen,
  pollingIntervalMs,
  viewMode = "session",
}: {
  initialState: LuckyDrawDisplayEnvelope;
  eventOrScreen: string;
  pollingIntervalMs?: number;
  viewMode?: "session" | "prize";
}) {
  const state = useRealtimeDisplay("lucky_draw", eventOrScreen, initialState, pollingIntervalMs);

  if (viewMode === "prize") {
    return (
      <main className="min-h-screen w-full" style={{ backgroundColor: "#000000" }}>
        <LuckyDrawDisplayContent state={state} variant="prize" />
      </main>
    );
  }

  const progress = state.progress;
  const progressLabel = progress.planned > 0 ? `${progress.actual} / ${progress.planned} revealed` : `${progress.actual} revealed`;
  const title = state.prizeName ?? "Lucky Draw Ready";
  const subtitle = state.cue;

  return (
    <DisplayFrame
      moduleLabel="Lucky Draw"
      title={title}
      subtitle={subtitle}
      sceneLabel={state.scene}
      displayMode={state.displayMode}
      theme={state.theme}
      meta={
        <div className="space-y-3 text-sm text-white/80">
          <div className="flex items-center justify-between gap-4">
            <span className="uppercase tracking-[0.26em] text-white/58">Mode</span>
            <span className="font-semibold capitalize text-white">{state.layoutMode}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="uppercase tracking-[0.26em] text-white/58">Progress</span>
            <span className="font-semibold text-white">{progressLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="uppercase tracking-[0.26em] text-white/58">Animation</span>
            <span className="font-semibold text-white">{state.animationPreset.replace("_", " ")}</span>
          </div>
        </div>
      }
    >
      <LuckyDrawDisplayContent state={state} variant={viewMode} />
    </DisplayFrame>
  );
}
