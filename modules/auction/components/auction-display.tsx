"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeDisplay } from "@/modules/shared/components/use-realtime-display";
import type { AuctionPublicState } from "@/modules/shared/types/contracts";

export function AuctionDisplay({ initialState }: { initialState: AuctionPublicState }) {
  const state = useRealtimeDisplay("auction", initialState.eventSlug, initialState);

  return (
    <main className="flex min-h-screen flex-col justify-center gap-8 p-10" style={{ color: state.theme.textColor }}>
      <p className="text-lg uppercase tracking-[0.3em] text-orange-300">Auction Live</p>
      <h1 className="text-5xl font-semibold">Lot {state.lotNumber ?? "--"}: {state.lotTitle ?? "Waiting for lot"}</h1>
      <div className="card max-w-4xl">
        <p className="text-sm uppercase tracking-widest text-slate-400">Current Bid</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentBid}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="text-8xl font-bold text-orange-300"
          >
            {state.currentBid ? `$${state.currentBid.toLocaleString()}` : "--"}
          </motion.div>
        </AnimatePresence>
        {state.previousBid && <p className="mt-2 text-3xl text-slate-500 line-through">${state.previousBid.toLocaleString()}</p>}
      </div>
    </main>
  );
}
