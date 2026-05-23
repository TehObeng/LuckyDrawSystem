import { z } from "zod";
import { displayModeSchema, layoutModeSchema, luckyDrawAnimationPresetSchema, moduleTypeSchema, prizeBoardSettingsSchema, themeSettingsSchema } from "@/modules/shared/schemas/platform";

export const luckyDrawSceneSchema = z.enum(["idle", "ready", "revealing", "revealed", "session_complete", "prize_complete"]);
export const auctionSceneSchema = z.enum(["idle", "lot_intro", "opening_bid", "live_bid", "sold", "passed"]);
export const masterSceneSchema = z.enum(["blank", "lucky_draw", "auction"]);

export const winnerChipSchema = z.object({
  id: z.string(),
  ticketNumber: z.string(),
  emphasis: z.enum(["latest", "standard"]).default("standard"),
});

export const cleanBoardCardSchema = z.object({
  id: z.string().optional(),
  ticketNumber: z.string().optional(),
  status: z.enum(["empty", "rolling", "revealed", "confirmed"]).default("empty"),
});

export const cleanBoardSettingsSchema = z.object({
  designWidth: z.number().int().min(320).max(7680).default(1920),
  designHeight: z.number().int().min(240).max(4320).default(1080),
  displayAmount: z.number().int().min(1).max(120).default(12),
  columns: z.number().int().min(1).max(120).default(4),
  rows: z.number().int().min(1).max(120).default(3),
});

const displayEnvelopeBaseSchema = z.object({
  eventId: z.string(),
  eventSlug: z.string(),
  screenKey: z.string(),
  moduleType: moduleTypeSchema,
  revision: z.number().int().min(0),
  displayMode: displayModeSchema,
  theme: themeSettingsSchema,
  publishedAt: z.string(),
});

export const luckyDrawDisplaySchema = displayEnvelopeBaseSchema.extend({
  moduleType: z.literal("lucky_draw"),
  scene: luckyDrawSceneSchema,
  prizeCategoryId: z.string().optional(),
  drawSessionId: z.string().optional(),
  prizeName: z.string().optional(),
  prizeImageUrl: z.string().optional(),
  latestWinningNumber: z.string().optional(),
  winners: z.array(winnerChipSchema).default([]),
  allPrizeWinners: z.array(winnerChipSchema).default([]),
  layoutMode: layoutModeSchema,
  animationPreset: luckyDrawAnimationPresetSchema,
  animationSpeed: z.number().min(0.25).max(3).default(1),
  grid: z.object({
    itemCount: z.number().int().min(1).max(120),
    rows: z.number().int().min(1).max(120).optional(),
    cols: z.number().int().min(1).max(120).optional(),
  }),
  board: cleanBoardSettingsSchema.default({}),
  cards: z.array(cleanBoardCardSchema).default([]),
  progress: z.object({
    planned: z.number().int().min(0),
    actual: z.number().int().min(0),
  }),
  prizeProgress: z.object({
    planned: z.number().int().min(0),
    actual: z.number().int().min(0),
  }),
  prizeBoardSettings: prizeBoardSettingsSchema.default({}),
  cue: z.string().optional(),
  replayToken: z.number().int().min(0).default(0),
});

export const auctionDisplaySchema = displayEnvelopeBaseSchema.extend({
  moduleType: z.literal("auction"),
  scene: auctionSceneSchema,
  auctionSessionId: z.string().optional(),
  lotId: z.string().optional(),
  lotNumber: z.string().optional(),
  lotTitle: z.string().optional(),
  lotImageUrl: z.string().optional(),
  currencyCode: z.string().default("USD"),
  currentBid: z.number().nonnegative().optional(),
  previousBid: z.number().nonnegative().optional(),
  bidderLabel: z.string().optional(),
  openingLabel: z.string().optional(),
  statusLabel: z.string().optional(),
  note: z.string().optional(),
  cue: z.string().optional(),
});

export const masterDisplaySchema = displayEnvelopeBaseSchema.extend({
  moduleType: z.literal("master"),
  scene: masterSceneSchema,
  activeScreenKey: z.string().optional(),
  note: z.string().optional(),
  luckyDrawState: luckyDrawDisplaySchema.optional(),
  auctionState: auctionDisplaySchema.optional(),
});

export const liveDisplayEnvelopeSchema = z.discriminatedUnion("moduleType", [luckyDrawDisplaySchema, auctionDisplaySchema, masterDisplaySchema]);

export type LuckyDrawScene = z.infer<typeof luckyDrawSceneSchema>;
export type AuctionScene = z.infer<typeof auctionSceneSchema>;
export type MasterScene = z.infer<typeof masterSceneSchema>;
export type CleanBoardCard = z.infer<typeof cleanBoardCardSchema>;
export type CleanBoardSettings = z.infer<typeof cleanBoardSettingsSchema>;
export type LuckyDrawDisplayEnvelope = z.infer<typeof luckyDrawDisplaySchema>;
export type AuctionDisplayEnvelope = z.infer<typeof auctionDisplaySchema>;
export type MasterDisplayEnvelope = z.infer<typeof masterDisplaySchema>;
export type LiveDisplayEnvelope = z.infer<typeof liveDisplayEnvelopeSchema>;
