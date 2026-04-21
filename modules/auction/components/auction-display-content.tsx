"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { AuctionDisplayEnvelope } from "@/modules/shared/types/contracts";
import { formatCurrency } from "@/modules/shared/utils/formatters";

function formatBid(value: number | undefined, currencyCode: string) {
  if (value === undefined) {
    return "--";
  }

  return formatCurrency(value, "en-US", currencyCode);
}

export function AuctionDisplayContent({ state }: { state: AuctionDisplayEnvelope }) {
  const currentBid = formatBid(state.currentBid, state.currencyCode);
  const previousBid = formatBid(state.previousBid, state.currencyCode);

  return (
    <div className="grid w-full items-stretch gap-6 xl:grid-cols-[1.15fr,0.85fr] xl:gap-8">
      <section
        className="panel-strong relative overflow-hidden border p-6 sm:p-8 xl:p-10"
        style={{
          borderColor: `${state.theme.accentColor}35`,
          boxShadow: `0 28px 80px ${state.theme.accentColor}1c`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-40"
          style={{
            background: `linear-gradient(180deg, ${state.theme.accentColor}1f 0%, transparent 100%)`,
          }}
        />

        <div className="relative flex h-full min-h-[22rem] flex-col justify-between gap-8">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.36em] text-white/58">
                {state.openingLabel ?? "Current bid"}
              </p>
              <p className="max-w-xl text-base text-white/72 sm:text-lg">
                {state.scene === "sold"
                  ? "The lot has been confirmed sold on the public screen."
                  : state.scene === "passed"
                    ? "The lot has been marked passed."
                    : state.scene === "lot_intro"
                      ? "Cue the lot intro before the opening number."
                      : "New accepted bids replace the previous price immediately."}
              </p>
            </div>
            {state.lotImageUrl ? (
              <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03]">
                <img src={state.lotImageUrl} alt={state.lotTitle ?? "Auction lot"} className="h-full min-h-56 w-full object-cover" />
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${state.currentBid ?? "idle"}-${state.scene}-${state.revision}`}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="text-5xl font-semibold tracking-tight sm:text-7xl xl:text-[6.75rem]"
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                style={{ color: state.theme.textColor }}
                transition={{ duration: 0.42, ease: [0.2, 0.9, 0.3, 1] }}
              >
                {currentBid}
              </motion.div>
            </AnimatePresence>

            {state.previousBid !== undefined ? (
              <motion.p
                animate={{ opacity: 0.72, x: 0 }}
                className="text-2xl text-white/46 line-through sm:text-3xl xl:text-4xl"
                initial={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.3 }}
              >
                {previousBid}
              </motion.p>
            ) : (
              <p className="text-lg text-white/42 sm:text-xl">
                Previous bid will appear here after the next accepted increase.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className="rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em]"
              style={{
                borderColor: `${state.theme.accentColor}55`,
                backgroundColor: `${state.theme.accentColor}16`,
              }}
            >
              {state.statusLabel ?? "Waiting"}
            </span>
            {state.bidderLabel ? (
              <span className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.24em] text-white/78">
                {state.bidderLabel}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel min-h-[22rem] p-6 sm:p-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.36em] text-white/58">Lot detail</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {state.lotTitle ?? "No lot selected"}
            </h2>
          </div>

          <div className="space-y-4 text-base text-white/76 sm:text-lg">
            <div className="flex items-center justify-between gap-4 rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-5 py-4">
              <span className="uppercase tracking-[0.28em] text-white/52">Lot number</span>
              <span className="font-semibold text-white">{state.lotNumber ?? "--"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-5 py-4">
              <span className="uppercase tracking-[0.28em] text-white/52">Current bidder</span>
              <span className="font-semibold text-white">{state.bidderLabel ?? "Awaiting call"}</span>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] px-5 py-4">
              <div className="uppercase tracking-[0.28em] text-white/52">Operator note</div>
              <div className="mt-3 text-white/78">{state.note ?? state.cue ?? "No note yet."}</div>
            </div>
          </div>

          {(state.scene === "sold" || state.scene === "passed") && (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[1.65rem] border px-6 py-6 text-center"
              initial={{ opacity: 0, scale: 0.94 }}
              style={{
                borderColor: `${state.theme.accentColor}55`,
                backgroundColor: `${state.theme.accentColor}16`,
              }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-sm uppercase tracking-[0.44em] text-white/58">Final state</div>
              <div className="mt-3 text-4xl font-semibold uppercase tracking-[0.12em] text-white sm:text-5xl">
                {state.scene === "sold" ? "Sold" : "Passed"}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
