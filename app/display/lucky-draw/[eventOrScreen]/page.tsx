import { LuckyDrawDisplay } from "@/modules/lucky-draw/components/lucky-draw-display";
import type { LuckyDrawPublicState } from "@/modules/shared/types/contracts";

export default async function LuckyDrawDisplayPage({ params }: { params: Promise<{ eventOrScreen: string }> }) {
  const { eventOrScreen } = await params;

  const initialState: LuckyDrawPublicState = {
    moduleType: "lucky_draw",
    eventSlug: eventOrScreen,
    prizeName: "Ready",
    winners: [],
    layoutMode: "grid",
    animationPreset: "fade_pop",
    status: "idle",
    updatedAt: new Date().toISOString(),
    theme: {
      backgroundType: "color",
      accentColor: "#22d3ee",
      textColor: "#ffffff",
      overlayMode: false,
    },
  };

  return <LuckyDrawDisplay initialState={initialState} />;
}
