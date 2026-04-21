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
    itemCount: z.number().int().min(1).max(60),
    rows: z.number().int().min(1).max(12).optional(),
    cols: z.number().int().min(1).max(12).optional(),
  }),
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
export type LuckyDrawDisplayEnvelope = z.infer<typeof luckyDrawDisplaySchema>;
export type AuctionDisplayEnvelope = z.infer<typeof auctionDisplaySchema>;
export type MasterDisplayEnvelope = z.infer<typeof masterDisplaySchema>;
export type LiveDisplayEnvelope = z.infer<typeof liveDisplayEnvelopeSchema>;
