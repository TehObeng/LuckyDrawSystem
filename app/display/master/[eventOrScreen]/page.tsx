import { notFound } from "next/navigation";
import { MasterDisplay } from "@/modules/shared/components/master-display";
import { getPublicDisplayState, getResolvedDisplayScreen, parseEventSettings } from "@/modules/shared/services/display-state-service";

export const dynamic = "force-dynamic";

export default async function MasterDisplayPage({ params }: { params: Promise<{ eventOrScreen: string }> }) {
  const { eventOrScreen } = await params;
  const [state, screen] = await Promise.all([
    getPublicDisplayState("master", eventOrScreen),
    getResolvedDisplayScreen("master", eventOrScreen),
  ]);

  if (!state || state.moduleType !== "master" || !screen) {
    notFound();
  }

  const settings = parseEventSettings(screen.event.settings);

  return <MasterDisplay eventOrScreen={eventOrScreen} initialState={state} pollingIntervalMs={settings.fallbackPollingIntervalMs} />;
}
