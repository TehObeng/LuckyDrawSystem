"use client";

import { AnimatePresence, motion } from "framer-motion";
import { withBasePath } from "@/lib/public-path";
import { cn } from "@/lib/utils";
import type { LuckyDrawAnimationPreset, LuckyDrawDisplayEnvelope, PrizeBoardSettings } from "@/modules/shared/types/contracts";

type LuckyDrawBoardVariant = "session" | "prize";

const BOARD_BACKGROUND = "#000000";
const BOARD_TILE_BACKGROUND = "#ffffff";
const BOARD_TEXT_COLOR = "#ff0000";
const BOARD_BORDER_COLOR = "#ffffff";
const BOARD_LATEST_BORDER_COLOR = "#ff0000";

function getRevealMotion(preset: LuckyDrawAnimationPreset, speed: number) {
  const duration = Math.max(0.32, 0.86 / speed);

  switch (preset) {
    case "scramble":
      return {
        initial: { opacity: 0, y: 24, letterSpacing: "0.6em", filter: "blur(18px)" },
        animate: { opacity: 1, y: 0, letterSpacing: "0.12em", filter: "blur(0px)" },
        exit: { opacity: 0, y: -18, filter: "blur(12px)" },
        transition: { duration, ease: [0.16, 1, 0.3, 1] as const },
      };
    case "rolling":
      return {
        initial: { opacity: 0, y: 64, rotateX: -70 },
        animate: { opacity: 1, y: 0, rotateX: 0 },
        exit: { opacity: 0, y: -42, rotateX: 70 },
        transition: { duration, ease: [0.2, 0.9, 0.2, 1] as const },
      };
    case "slot":
      return {
        initial: { opacity: 0, y: 84, scaleY: 1.2 },
        animate: { opacity: 1, y: 0, scaleY: 1 },
        exit: { opacity: 0, y: -64, scaleY: 0.92 },
        transition: { duration, ease: [0.17, 0.84, 0.44, 1] as const },
      };
    case "flip":
      return {
        initial: { opacity: 0, rotateX: -90, scale: 0.94 },
        animate: { opacity: 1, rotateX: 0, scale: 1 },
        exit: { opacity: 0, rotateX: 90, scale: 0.94 },
        transition: { duration, ease: [0.2, 0.85, 0.3, 1] as const },
      };
    case "zoom":
      return {
        initial: { opacity: 0, scale: 0.52 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.12 },
        transition: { duration, ease: [0.22, 1, 0.36, 1] as const },
      };
    case "celebration_burst":
      return {
        initial: { opacity: 0, scale: 0.42, rotate: -4, filter: "saturate(1.35)" },
        animate: { opacity: 1, scale: [0.42, 1.08, 1], rotate: [0, 2, 0], filter: "saturate(1)" },
        exit: { opacity: 0, scale: 1.08, rotate: 4 },
        transition: { duration: duration + 0.1, ease: [0.16, 1, 0.3, 1] as const },
      };
    case "fade_pop":
    default:
      return {
        initial: { opacity: 0, scale: 0.78, y: 24 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 1.06, y: -16 },
        transition: { duration, ease: [0.2, 0.9, 0.3, 1] as const },
      };
  }
}

function buildGridSlots(state: LuckyDrawDisplayEnvelope) {
  return Array.from({
    length: Math.max(state.grid.itemCount, state.winners.length, 1),
  }).map((_, index) => state.winners[index] ?? null);
}

function getGridColumnCount(state: LuckyDrawDisplayEnvelope) {
  if (state.grid.cols) {
    return state.grid.cols;
  }

  const suggested = Math.ceil(Math.sqrt(Math.max(state.grid.itemCount, state.winners.length, 1)));
  return Math.min(6, Math.max(2, suggested));
}

function renderSessionBoard(state: LuckyDrawDisplayEnvelope, boardSettings: PrizeBoardSettings) {
  const gridSlots = buildGridSlots(state);
  const gridColumnCount = getGridColumnCount(state);

  if (state.layoutMode === "exclusive") {
    return (
      <div className="mt-8 space-y-3">
        {state.winners.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed p-6 text-base" style={{ borderColor: BOARD_BORDER_COLOR, backgroundColor: BOARD_BACKGROUND, color: BOARD_TEXT_COLOR }}>
            No winners revealed yet for this session.
          </div>
        ) : (
          state.winners
            .slice()
            .reverse()
            .map((winner) => (
              <div
                key={winner.id}
                className="flex items-center justify-between rounded-[1.35rem] border px-5 py-4"
                style={{
                  borderColor: winner.emphasis === "latest" ? BOARD_LATEST_BORDER_COLOR : BOARD_BORDER_COLOR,
                  backgroundColor: BOARD_TILE_BACKGROUND,
                }}
              >
                <span
                  className="uppercase tracking-[0.3em]"
                  style={{ color: BOARD_TEXT_COLOR, fontSize: `${boardSettings.winnerLabelFontSize}px` }}
                >
                  {winner.emphasis === "latest" ? "Latest" : "Recorded"}
                </span>
                <span
                  className="font-semibold tracking-[0.16em]"
                  style={{ color: BOARD_TEXT_COLOR, fontSize: `${boardSettings.numberFontSize}px` }}
                >
                  {winner.ticketNumber}
                </span>
              </div>
            ))
        )}
      </div>
    );
  }

  return (
    <div
      className="mt-8 grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${gridColumnCount}, minmax(0, 1fr))`,
      }}
    >
      {gridSlots.map((winner, index) => (
        <motion.div
          key={winner ? winner.id : `empty-${index}`}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "min-h-24 rounded-[1.4rem] border px-3 py-4 text-center sm:min-h-28 sm:px-4 sm:py-5",
            winner ? "shadow-[0_18px_48px_rgba(2,6,23,0.25)]" : "border-dashed",
          )}
          initial={{ opacity: 0.5, y: 12 }}
          style={{
            borderColor: winner?.emphasis === "latest" ? BOARD_LATEST_BORDER_COLOR : BOARD_BORDER_COLOR,
            backgroundColor: winner
              ? BOARD_TILE_BACKGROUND
              : BOARD_BACKGROUND,
          }}
          transition={{ duration: 0.35, ease: [0.2, 0.9, 0.3, 1] }}
        >
          {winner ? (
            <div className="flex h-full flex-col justify-center gap-2">
              <span
                className="uppercase tracking-[0.28em]"
                style={{ color: BOARD_TEXT_COLOR, fontSize: `${boardSettings.winnerLabelFontSize}px` }}
              >
                {winner.emphasis === "latest" ? "Newest" : "Winner"}
              </span>
              <span
                className="break-words font-semibold tracking-[0.12em]"
                style={{ color: BOARD_TEXT_COLOR, fontSize: `${boardSettings.numberFontSize}px` }}
              >
                {winner.ticketNumber}
              </span>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.28em]" style={{ color: BOARD_TEXT_COLOR }}>
              Awaiting reveal
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function renderPrizeBoard(state: LuckyDrawDisplayEnvelope, boardSettings: PrizeBoardSettings, fullScreen = false) {
  return (
    <div className={cn("flex justify-center", fullScreen ? "w-full" : "mt-8")}>
      <div
        className="grid w-full"
        style={{
          maxWidth: `${boardSettings.boardMaxWidth}px`,
          gap: `${boardSettings.gap}px`,
          gridTemplateColumns: `repeat(${boardSettings.columns}, minmax(${boardSettings.minItemWidth}px, 1fr))`,
        }}
      >
        {state.allPrizeWinners.length === 0 ? (
          <div className="col-span-full rounded-[1.4rem] border border-dashed p-6 text-center text-base" style={{ borderColor: BOARD_BORDER_COLOR, backgroundColor: BOARD_BACKGROUND, color: BOARD_TEXT_COLOR }}>
            No winners have been revealed for this prize category yet.
          </div>
        ) : (
          state.allPrizeWinners.map((winner) => (
            <motion.div
              key={winner.id}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center rounded-[1.4rem] border px-4 py-5 text-center shadow-[0_18px_48px_rgba(2,6,23,0.25)]"
              initial={{ opacity: 0.5, y: 12 }}
              style={{
                minHeight: `${boardSettings.cardMinHeight}px`,
                borderColor: winner.emphasis === "latest" ? BOARD_LATEST_BORDER_COLOR : BOARD_BORDER_COLOR,
                backgroundColor: BOARD_TILE_BACKGROUND,
              }}
              transition={{ duration: 0.35, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <span
                className="break-words"
                style={{
                  fontFamily: boardSettings.fontFamily === "inherit" ? undefined : boardSettings.fontFamily,
                  fontSize: `${boardSettings.numberFontSize || boardSettings.fontSize}px`,
                  fontWeight: boardSettings.fontWeight,
                  letterSpacing: "0.08em",
                  lineHeight: 1.1,
                  color: BOARD_TEXT_COLOR,
                }}
              >
                {winner.ticketNumber}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

export function LuckyDrawDisplayContent({
  state,
  variant = "session",
}: {
  state: LuckyDrawDisplayEnvelope;
  variant?: LuckyDrawBoardVariant;
}) {
  const numberMotion = getRevealMotion(state.animationPreset, state.animationSpeed);
  const latestWinnerKey = `${state.latestWinningNumber ?? "idle"}-${state.replayToken}-${state.scene}-${state.revision}-${variant}`;
  const boardTitle = "Winner board";
  const boardCopy =
    state.layoutMode === "exclusive"
      ? "Recent winners remain visible for operator confidence while the exclusive reveal takes focus."
      : "The newest winner is highlighted while the grid fills progressively.";
  const boardCount = state.winners.length;

  if (variant === "prize") {
    return (
      <section
        className="flex min-h-screen w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10 xl:px-14 xl:py-12"
        style={{ backgroundColor: BOARD_BACKGROUND, color: BOARD_TEXT_COLOR }}
      >
        {renderPrizeBoard(state, state.prizeBoardSettings, true)}
      </section>
    );
  }

  return (
    <div
      className={cn(
        "grid w-full items-stretch gap-6 xl:gap-8",
        variant === "session" && state.layoutMode === "exclusive" ? "xl:grid-cols-[1.3fr,0.7fr]" : "xl:grid-cols-[0.95fr,1.05fr]",
      )}
    >
      <section
        className="panel-strong relative overflow-hidden border p-6 sm:p-8 xl:p-10"
        style={{
          borderColor: `${state.theme.accentColor}35`,
          boxShadow: `0 28px 80px ${state.theme.accentColor}1c`,
          backgroundColor: state.theme.surfaceTint,
          color: state.theme.textColor,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-40 opacity-80"
          style={{
            background: `linear-gradient(180deg, ${state.theme.accentColor}24 0%, transparent 100%)`,
          }}
        />

        <div className="relative flex h-full min-h-[22rem] flex-col justify-between gap-8">
          <div className={cn("grid gap-6", state.prizeImageUrl ? "xl:grid-cols-[1.2fr_0.8fr]" : undefined)}>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.36em]" style={{ color: state.theme.mutedTextColor }}>
                Current reveal
              </p>
              <p className="max-w-xl text-base sm:text-lg" style={{ color: state.theme.mutedTextColor }}>
                {state.scene === "revealing"
                  ? "The reveal animation is live on screen."
                  : state.scene === "prize_complete"
                    ? "This prize category is complete."
                    : state.scene === "session_complete"
                      ? "This session is complete and ready for the next cue."
                      : "The newest winning number stays featured for stage visibility."}
              </p>
            </div>
            {state.prizeImageUrl ? (
              <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03]">
                <img src={withBasePath(state.prizeImageUrl)} alt={state.prizeName ?? "Prize"} className="h-full min-h-56 w-full object-cover" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-1 items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={latestWinnerKey}
                animate={numberMotion.animate}
                className="w-full max-w-4xl rounded-[2rem] border px-6 py-8 text-center shadow-[0_32px_90px_rgba(2,6,23,0.36)] sm:px-10 sm:py-10 xl:px-12 xl:py-14"
                exit={numberMotion.exit}
                initial={numberMotion.initial}
                style={{
                  borderColor: `${state.theme.accentColor}5c`,
                  backgroundColor: state.theme.panelStyle === "minimal" ? "rgba(4, 10, 24, 0.42)" : state.theme.surfaceTint,
                  color: state.theme.textColor,
                }}
                transition={numberMotion.transition}
              >
                <div className="text-xs uppercase tracking-[0.44em] sm:text-sm" style={{ color: state.theme.mutedTextColor }}>
                  Winning number
                </div>
                <div className="mt-4 break-words text-5xl font-semibold tracking-[0.16em] sm:text-7xl xl:text-[7rem]">
                  {state.latestWinningNumber ?? "WAITING"}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: state.theme.mutedTextColor }}>
            <span className="rounded-full border px-3 py-1 uppercase tracking-[0.26em]" style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)" }}>
              {state.scene.replace(/_/g, " ")}
            </span>
            <span className="rounded-full border px-3 py-1 uppercase tracking-[0.26em]" style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)" }}>
              Revision {state.revision}
            </span>
          </div>
        </div>
      </section>

      <section className="panel min-h-[22rem] p-6 sm:p-8" style={{ backgroundColor: BOARD_BACKGROUND, color: BOARD_TEXT_COLOR, borderColor: BOARD_BORDER_COLOR }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.36em]" style={{ color: BOARD_TEXT_COLOR }}>{boardTitle}</p>
            <p className="mt-2 text-base" style={{ color: BOARD_TEXT_COLOR }}>{boardCopy}</p>
          </div>
          <div className="rounded-full border px-4 py-2 text-sm font-medium" style={{ borderColor: BOARD_BORDER_COLOR, backgroundColor: BOARD_TILE_BACKGROUND, color: BOARD_TEXT_COLOR }}>
            {boardCount} saved
          </div>
        </div>

        {renderSessionBoard(state, state.prizeBoardSettings)}
      </section>
    </div>
  );
}
