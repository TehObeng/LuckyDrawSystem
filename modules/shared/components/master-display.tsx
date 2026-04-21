"use client";

import { DisplayFrame } from "@/modules/shared/components/display-frame";
import { useRealtimeDisplay } from "@/modules/shared/components/use-realtime-display";
import { LuckyDrawDisplayContent } from "@/modules/lucky-draw/components/lucky-draw-display-content";
import { AuctionDisplayContent } from "@/modules/auction/components/auction-display-content";
import type { MasterDisplayEnvelope } from "@/modules/shared/types/contracts";

export function MasterDisplay({
  initialState,
  eventOrScreen,
  pollingIntervalMs,
}: {
  initialState: MasterDisplayEnvelope;
  eventOrScreen: string;
  pollingIntervalMs?: number;
}) {
  const state = useRealtimeDisplay("master", eventOrScreen, initialState, pollingIntervalMs);
  const title =
    state.scene === "lucky_draw"
      ? state.luckyDrawState?.prizeName ?? "Lucky Draw"
      : state.scene === "auction"
        ? state.auctionState?.lotTitle ?? "Auction"
        : "Master Overlay Standing By";
  const subtitle =
    state.note ??
    (state.scene === "blank"
      ? "Choose Lucky Draw or Auction from the live control workspace."
      : `Currently mirroring ${state.scene === "lucky_draw" ? "Lucky Draw" : "Auction"}.`);

  return (
    <DisplayFrame
      moduleLabel="Master Overlay"
      title={title}
      subtitle={subtitle}
      sceneLabel={state.scene}
      displayMode={state.displayMode}
      theme={state.theme}
      meta={
        <div className="space-y-3 text-sm text-white/80">
          <div className="flex items-center justify-between gap-4">
            <span className="uppercase tracking-[0.26em] text-white/58">Source</span>
            <span className="font-semibold capitalize text-white">{state.scene.replace("_", " ")}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="uppercase tracking-[0.26em] text-white/58">Route key</span>
            <span className="font-semibold text-white">{state.activeScreenKey ?? state.screenKey}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="uppercase tracking-[0.26em] text-white/58">Revision</span>
            <span className="font-semibold text-white">{state.revision}</span>
          </div>
        </div>
      }
    >
      {state.scene === "lucky_draw" && state.luckyDrawState ? (
        <LuckyDrawDisplayContent state={state.luckyDrawState} />
      ) : state.scene === "auction" && state.auctionState ? (
        <AuctionDisplayContent state={state.auctionState} />
      ) : (
        <div className="flex w-full items-center justify-center">
          <div className="panel-strong max-w-2xl rounded-[2rem] border border-white/10 px-8 py-10 text-center">
            <p className="text-sm uppercase tracking-[0.32em] text-white/48">Master output</p>
            <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Blank / Ready</h2>
            <p className="mt-4 text-base text-white/68 sm:text-lg">
              The operator has not routed a module to the master overlay yet. Use the live workspace to switch this screen to Lucky Draw or Auction.
            </p>
          </div>
        </div>
      )}
    </DisplayFrame>
  );
}
