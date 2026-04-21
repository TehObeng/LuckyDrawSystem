import { AuctionDisplay } from "@/modules/auction/components/auction-display";
import { getPublicDisplayState, getResolvedDisplayScreen, parseEventSettings } from "@/modules/shared/services/display-state-service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuctionDisplayPage({ params }: { params: Promise<{ eventOrScreen: string }> }) {
  const { eventOrScreen } = await params;
  const [state, screen] = await Promise.all([
    getPublicDisplayState("auction", eventOrScreen),
    getResolvedDisplayScreen("auction", eventOrScreen),
  ]);

  if (!state || state.moduleType !== "auction" || !screen) {
    notFound();
  }

  const settings = parseEventSettings(screen.event.settings);

  return <AuctionDisplay eventOrScreen={eventOrScreen} initialState={state} pollingIntervalMs={settings.fallbackPollingIntervalMs} />;
}
