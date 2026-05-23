"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useRealtimeDisplay } from "@/modules/shared/components/use-realtime-display";
import type { CleanBoardCard, LuckyDrawDisplayEnvelope } from "@/modules/shared/types/contracts";

function randomDigitString(length: number) {
  return Array.from({ length: Math.max(4, Math.min(length, 16)) })
    .map(() => Math.floor(Math.random() * 10))
    .join("");
}

function RollingNumber({ length, fontSize, color }: { length: number; fontSize: number; color: string }) {
  const [value, setValue] = useState(() => randomDigitString(length));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setValue(randomDigitString(length));
    }, 70);

    return () => window.clearInterval(timer);
  }, [length]);

  return (
    <span
      className="font-black tabular-nums tracking-[0.08em]"
      style={{
        color,
        fontSize,
        lineHeight: 1,
        textShadow: `0 0 24px ${color}66`,
      }}
    >
      {value}
    </span>
  );
}

function normalizeCards(state: LuckyDrawDisplayEnvelope): CleanBoardCard[] {
  const displayAmount = state.board.displayAmount;
  const cards = state.cards.length
    ? state.cards
    : state.winners.map((winner) => ({
        id: winner.id,
        ticketNumber: winner.ticketNumber,
        status: "revealed" as const,
      }));

  return [
    ...cards.slice(-displayAmount),
    ...Array.from({ length: Math.max(0, displayAmount - cards.length) }).map(() => ({
      status: "empty" as const,
    })),
  ];
}

function getCardStyle(status: CleanBoardCard["status"], settings: LuckyDrawDisplayEnvelope["prizeBoardSettings"]) {
  if (status === "rolling") {
    return {
      backgroundColor: `${settings.rollingCardBackgroundColor}8c`,
      borderColor: settings.rollingBorderColor,
      color: settings.rollingNumberColor,
      boxShadow: `0 0 40px ${settings.rollingBorderColor}3d`,
    };
  }

  if (status === "confirmed") {
    return {
      backgroundColor: settings.confirmedCardBackgroundColor,
      borderColor: settings.confirmedBorderColor,
      color: settings.confirmedNumberColor,
      boxShadow: `0 0 44px ${settings.confirmedBorderColor}38`,
    };
  }

  if (status === "revealed") {
    return {
      backgroundColor: settings.revealedCardBackgroundColor,
      borderColor: settings.revealedBorderColor,
      color: settings.numberColor,
      boxShadow: `0 0 44px ${settings.revealedBorderColor}38`,
    };
  }

  return {
    backgroundColor: `${settings.emptyCardBackgroundColor}59`,
    borderColor: settings.cardBorderColor,
    color: settings.waitingTextColor,
    boxShadow: "none",
  };
}

function getCardMotion(preset: LuckyDrawDisplayEnvelope["animationPreset"]) {
  if (preset === "flip") {
    return { initial: { opacity: 0.35, rotateX: -45 }, animate: { opacity: 1, rotateX: 0 } };
  }

  if (preset === "zoom" || preset === "celebration_burst") {
    return { initial: { opacity: 0.35, scale: 0.86 }, animate: { opacity: 1, scale: 1 } };
  }

  if (preset === "rolling" || preset === "slot") {
    return { initial: { opacity: 0.35, y: 24 }, animate: { opacity: 1, y: 0 } };
  }

  return { initial: { opacity: 0.42, scale: 0.96, y: 10 }, animate: { opacity: 1, scale: 1, y: 0 } };
}

export function LuckyDrawCleanDisplay({
  initialState,
  eventOrScreen,
  pollingIntervalMs,
}: {
  initialState: LuckyDrawDisplayEnvelope;
  eventOrScreen: string;
  pollingIntervalMs?: number;
}) {
  const state = useRealtimeDisplay("lucky_draw", eventOrScreen, initialState, pollingIntervalMs);
  const board = state.board;
  const settings = state.prizeBoardSettings;
  const [viewport, setViewport] = useState({ width: board.designWidth, height: board.designHeight });
  const cards = useMemo(() => normalizeCards(state), [state]);
  const cardDesignWidth = board.designWidth / board.columns;
  const cardDesignHeight = board.designHeight / board.rows;
  const numberFontSize = Math.round(Math.max(24, Math.min(118, Math.min(cardDesignWidth / 4.2, cardDesignHeight / 2.35))));
  const emptyFontSize = Math.round(Math.max(10, Math.min(18, numberFontSize / 4)));
  const rollingLength = Math.max(6, ...cards.map((card) => card.ticketNumber?.length ?? 0));
  const scale = Math.min(viewport.width / board.designWidth, viewport.height / board.designHeight);
  const cardMotion = getCardMotion(state.animationPreset);
  const pageBackground = settings.pageBackgroundMode === "color" ? settings.pageBackgroundColor : "transparent";
  const gridBackground = settings.gridBackgroundMode === "color" ? settings.gridBackgroundColor : "transparent";
  const transitionDuration = Math.max(0.14, 0.42 / state.animationSpeed);

  useEffect(() => {
    const htmlBackground = document.documentElement.style.background;
    const bodyBackground = document.body.style.background;
    const bodyOverflow = document.body.style.overflow;

    document.documentElement.style.background = pageBackground;
    document.body.style.background = pageBackground;
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.background = htmlBackground;
      document.body.style.background = bodyBackground;
      document.body.style.overflow = bodyOverflow;
    };
  }, [pageBackground]);

  useEffect(() => {
    function syncViewport() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  return (
    <main
      className="flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent"
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: pageBackground,
      }}
    >
      <section
        className="relative grid overflow-hidden bg-transparent"
        style={{
          width: board.designWidth,
          height: board.designHeight,
          aspectRatio: `${board.designWidth} / ${board.designHeight}`,
          padding: settings.cleanGridPadding,
          gap: settings.cleanGridGap,
          gridTemplateColumns: `repeat(${board.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${board.rows}, minmax(0, 1fr))`,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          flex: "0 0 auto",
          backgroundColor: gridBackground,
        }}
      >
        <div className="pointer-events-none absolute left-6 top-5 z-10 max-w-[70%] truncate text-xs font-semibold uppercase tracking-[0.26em] text-white/42">
          {state.prizeName ?? "Lucky Draw"}
        </div>
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => (
            <motion.div
              key={card.id ?? `empty-${index}`}
              animate={cardMotion.animate}
              className={cn("relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-lg border text-center")}
              initial={cardMotion.initial}
              style={getCardStyle(card.status, settings)}
              transition={{ duration: transitionDuration, ease: [0.2, 0.9, 0.3, 1] }}
            >
              {card.status === "rolling" ? (
                <RollingNumber length={rollingLength} fontSize={numberFontSize} color={settings.rollingNumberColor} />
              ) : card.ticketNumber ? (
                <span
                  className="max-w-full break-words px-3 font-black tabular-nums tracking-[0.08em]"
                  style={{
                    fontSize: numberFontSize,
                    lineHeight: 1,
                  }}
                >
                  {card.ticketNumber}
                </span>
              ) : (
                <span
                  className="uppercase tracking-[0.22em] text-white/18"
                  style={{
                    fontSize: emptyFontSize,
                  }}
                >
                  Waiting
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </section>
    </main>
  );
}
