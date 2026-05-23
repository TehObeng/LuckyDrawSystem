export type {
  AuctionDisplayEnvelope,
  ChatOverlayDisplayEnvelope,
  ChatOverlayScene,
  AuctionScene,
  CleanBoardCard,
  CleanBoardSettings,
  LiveDisplayEnvelope,
  LuckyDrawDisplayEnvelope,
  LuckyDrawScene,
  MasterDisplayEnvelope,
  MasterScene,
} from "@/modules/shared/schemas/display";
export {
  auctionDisplaySchema,
  chatOverlayDisplaySchema,
  chatOverlaySceneSchema,
  auctionSceneSchema,
  cleanBoardCardSchema,
  cleanBoardSettingsSchema,
  liveDisplayEnvelopeSchema,
  luckyDrawDisplaySchema,
  luckyDrawSceneSchema,
  masterDisplaySchema,
  masterSceneSchema,
} from "@/modules/shared/schemas/display";
export type {
  ChatOverlayConfig,
  EventSettings,
  PrizeBoardSettings,
  ThemeSettings as ThemeConfig,
  TicketFormatSettings,
} from "@/modules/shared/schemas/platform";
export {
  backgroundColorModeSchema,
  backgroundTypeSchema,
  backgroundFitSchema,
  backgroundPositionSchema,
  chatOverlayDirectionSchema,
  chatOverlayConfigSchema,
  chatOverlayStyleSchema,
  contentAlignmentSchema,
  defaultChatOverlayConfig,
  defaultEventSettings,
  defaultPrizeBoardSettings,
  defaultThemeSettings,
  defaultTicketFormat,
  displayModeSchema,
  duplicatePolicySchema,
  eventSettingsSchema,
  heroImageBehaviorSchema,
  layoutModeSchema,
  logoPositionSchema,
  luckyDrawAnimationPresetSchema,
  masterDisplaySourceSchema,
  moduleTypeSchema,
  operatorRoleSchema,
  panelStyleSchema,
  prizeBoardSettingsSchema,
  themeSettingsSchema,
  ticketFormatSchema,
} from "@/modules/shared/schemas/platform";

export type ModuleType = "lucky_draw" | "auction" | "chat_overlay" | "master";
export type LuckyDrawAnimationPreset =
  | "scramble"
  | "rolling"
  | "slot"
  | "flip"
  | "zoom"
  | "fade_pop"
  | "celebration_burst";

export const luckyDrawAnimationPresets: LuckyDrawAnimationPreset[] = [
  "scramble",
  "rolling",
  "slot",
  "flip",
  "zoom",
  "fade_pop",
  "celebration_burst",
];

export function isLuckyDrawAnimationPreset(value: string): value is LuckyDrawAnimationPreset {
  return luckyDrawAnimationPresets.includes(value as LuckyDrawAnimationPreset);
}
