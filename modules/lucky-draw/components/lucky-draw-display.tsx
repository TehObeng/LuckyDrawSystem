"use client";

import { motion } from "framer-motion";
import { useRealtimeDisplay } from "@/modules/shared/components/use-realtime-display";
import type { LuckyDrawPublicState } from "@/modules/shared/types/contracts";

export function LuckyDrawDisplay({ initialState }: { initialState: LuckyDrawPublicState }) {
  const state = useRealtimeDisplay("lucky_draw", initialState.eventSlug, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center" style={{ color: state.theme.textColor }}>
      <p className="text-lg uppercase tracking-[0.3em] text-cyan-300">Lucky Draw</p>
      <h1 className="text-4xl font-semibold">{state.prizeName ?? "Waiting for reveal"}</h1>
      {state.layoutMode === "exclusive" ? (
        <motion.div
          key={state.latestWinningNumber}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-cyan-300/40 bg-slate-900/60 px-12 py-6 text-7xl font-bold"
        >
          {state.latestWinningNumber ?? "----"}
        </motion.div>
      ) : (
        <div className="grid w-full max-w-5xl grid-cols-2 gap-4 md:grid-cols-5">
          {state.winners.map((winner, index) => (
            <motion.div
              key={`${winner}-${index}`}
              initial={{ opacity: 0.5, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border p-4 text-3xl font-semibold ${index === state.winners.length - 1 ? "border-cyan-300 bg-cyan-500/15" : "border-slate-700"}`}
            >
              {winner}
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
