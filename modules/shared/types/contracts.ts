export type ModuleType = "lucky_draw" | "auction";

export type DisplayStatus = "idle" | "ready" | "revealing" | "revealed" | "sold" | "passed" | "session_complete";

export interface ThemeConfig {
  backgroundType: "color" | "image" | "overlay_safe";
  backgroundImageUrl?: string;
  accentColor: string;
  textColor: string;
  overlayMode: boolean;
}

export interface LuckyDrawPublicState {
  moduleType: "lucky_draw";
  eventSlug: string;
  prizeName?: string;
  latestWinningNumber?: string;
  winners: string[];
  layoutMode: "grid" | "exclusive";
  animationPreset: "scramble" | "rolling" | "slot" | "flip" | "zoom" | "fade_pop";
  status: DisplayStatus;
  updatedAt: string;
  theme: ThemeConfig;
}

export interface AuctionPublicState {
  moduleType: "auction";
  eventSlug: string;
  lotNumber?: string;
  lotTitle?: string;
  currentBid?: number;
  previousBid?: number;
  bidderLabel?: string;
  status: DisplayStatus;
  updatedAt: string;
  theme: ThemeConfig;
}

export type DisplayPayload = LuckyDrawPublicState | AuctionPublicState;
