import { LuckyDrawDisplay } from "@/modules/lucky-draw/components/lucky-draw-display";
import { getPublicDisplayState, getResolvedDisplayScreen, parseEventSettings } from "@/modules/shared/services/display-state-service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LuckyDrawDisplayPage({ params }: { params: Promise<{ eventOrScreen: string }> }) {
  const { eventOrScreen } = await params;
  const [state, screen] = await Promise.all([
    getPublicDisplayState("lucky_draw", eventOrScreen),
    getResolvedDisplayScreen("lucky_draw", eventOrScreen),
  ]);

  if (!state || state.moduleType !== "lucky_draw" || !screen) {
    notFound();
  }

  const settings = parseEventSettings(screen.event.settings);

  return <LuckyDrawDisplay eventOrScreen={eventOrScreen} initialState={state} pollingIntervalMs={settings.fallbackPollingIntervalMs} />;
}
