import { notFound } from "next/navigation";
import { LuckyDrawCleanDisplay } from "@/modules/lucky-draw/components/lucky-draw-clean-display";
import { getPublicDisplayState, getResolvedDisplayScreen, parseEventSettings } from "@/modules/shared/services/display-state-service";

export const dynamic = "force-dynamic";

export default async function LuckyDrawCleanDisplayPage({ params }: { params: Promise<{ eventOrScreen: string }> }) {
  const { eventOrScreen } = await params;
  const [state, screen] = await Promise.all([
    getPublicDisplayState("lucky_draw", eventOrScreen),
    getResolvedDisplayScreen("lucky_draw", eventOrScreen),
  ]);

  if (!state || state.moduleType !== "lucky_draw" || !screen) {
    notFound();
  }

  const settings = parseEventSettings(screen.event.settings);

  return <LuckyDrawCleanDisplay eventOrScreen={eventOrScreen} initialState={state} pollingIntervalMs={settings.fallbackPollingIntervalMs} />;
}
