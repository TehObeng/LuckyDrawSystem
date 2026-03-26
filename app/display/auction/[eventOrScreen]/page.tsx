import { AuctionDisplay } from "@/modules/auction/components/auction-display";
import type { AuctionPublicState } from "@/modules/shared/types/contracts";

export default async function AuctionDisplayPage({ params }: { params: Promise<{ eventOrScreen: string }> }) {
  const { eventOrScreen } = await params;

  const initialState: AuctionPublicState = {
    moduleType: "auction",
    eventSlug: eventOrScreen,
    status: "idle",
    updatedAt: new Date().toISOString(),
    theme: {
      backgroundType: "color",
      accentColor: "#f97316",
      textColor: "#ffffff",
      overlayMode: false,
    },
  };

  return <AuctionDisplay initialState={initialState} />;
}
