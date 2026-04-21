"use client";

import { DisplayFrame } from "@/modules/shared/components/display-frame";
import { useRealtimeDisplay } from "@/modules/shared/components/use-realtime-display";
import { AuctionDisplayContent } from "@/modules/auction/components/auction-display-content";
import type { AuctionDisplayEnvelope } from "@/modules/shared/types/contracts";

export function AuctionDisplay({
  initialState,
  eventOrScreen,
  pollingIntervalMs,
}: {
  initialState: AuctionDisplayEnvelope;
  eventOrScreen: string;
  pollingIntervalMs?: number;
}) {
  const state = useRealtimeDisplay("auction", eventOrScreen, initialState, pollingIntervalMs);
  const title = state.lotNumber ? `Lot ${state.lotNumber}${state.lotTitle ? ` • ${state.lotTitle}` : ""}` : "Awaiting lot cue";

  return (
    <DisplayFrame
      moduleLabel="Auction Live"
      title={title}
      subtitle={state.cue ?? state.note}
      sceneLabel={state.scene}
      displayMode={state.displayMode}
      theme={state.theme}
      meta={
        <div className="space-y-3 text-sm text-white/80">
          <div className="flex items-center justify-between gap-4">
            <span className="uppercase tracking-[0.26em] text-white/58">Status</span>
            <span className="font-semibold text-white">{state.statusLabel ?? "Waiting"}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="uppercase tracking-[0.26em] text-white/58">Currency</span>
            <span className="font-semibold text-white">{state.currencyCode}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="uppercase tracking-[0.26em] text-white/58">Revision</span>
            <span className="font-semibold text-white">{state.revision}</span>
          </div>
        </div>
      }
    >
      <AuctionDisplayContent state={state} />
    </DisplayFrame>
  );
}
