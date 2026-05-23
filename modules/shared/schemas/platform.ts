import { z } from "zod";

export const moduleTypeSchema = z.enum(["lucky_draw", "auction", "chat_overlay", "master"]);
export const operatorRoleSchema = z.enum(["admin", "operator"]);
export const duplicatePolicySchema = z.enum(["event", "category", "allow"]);
export const displayModeSchema = z.enum(["fullscreen", "overlay"]);
export const backgroundTypeSchema = z.enum(["image", "color", "overlay_safe", "video_placeholder"]);
export const backgroundColorModeSchema = z.enum(["solid", "gradient"]);
export const layoutModeSchema = z.enum(["grid", "exclusive"]);
export const luckyDrawAnimationPresetSchema = z.enum(["scramble", "rolling", "slot", "flip", "zoom", "fade_pop", "celebration_burst"]);
export const backgroundFitSchema = z.enum(["cover", "contain", "auto"]);
export const backgroundPositionSchema = z.enum(["center", "top", "bottom", "left", "right"]);
export const logoPositionSchema = z.enum(["top_left", "top_right", "top_center"]);
export const contentAlignmentSchema = z.enum(["left", "center"]);
export const panelStyleSchema = z.enum(["glass", "solid", "minimal"]);
export const heroImageBehaviorSchema = z.enum(["none", "poster", "spotlight", "background"]);
export const masterDisplaySourceSchema = z.enum(["blank", "lucky_draw", "auction", "chat_overlay"]);
export const chatOverlayStyleSchema = z.enum(["danmaku", "stack"]);
export const chatOverlayDirectionSchema = z.enum(["left", "right"]);

const hexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/);
const optionalStringSchema = z.string().trim().optional().transform((value) => (value ? value : undefined));

export const ticketFormatSchema = z
  .object({
    mode: z.enum(["numeric", "alphanumeric"]).default("numeric"),
    allowSeries: z.boolean().default(false),
    preserveLeadingZeros: z.boolean().default(true),
    fixedLength: z.number().int().min(1).max(32).nullable().default(null),
    minLength: z.number().int().min(1).max(32).default(1),
    maxLength: z.number().int().min(1).max(32).default(12),
    prefix: z.string().trim().max(16).default(""),
    regex: z.string().trim().max(128).default(""),
  })
  .superRefine((value, ctx) => {
    if (value.fixedLength !== null && (value.minLength !== value.fixedLength || value.maxLength !== value.fixedLength)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fixed length must match min and max length.",
        path: ["fixedLength"],
      });
    }

    if (value.minLength > value.maxLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum length cannot exceed maximum length.",
        path: ["minLength"],
      });
    }
  });

export const defaultTicketFormat = ticketFormatSchema.parse({});

export const chatOverlayConfigSchema = z.object({
  style: chatOverlayStyleSchema.default("danmaku"),
  scrollDirection: chatOverlayDirectionSchema.default("left"),
  laneCount: z.number().int().min(1).max(8).default(3),
  fontFamily: z.string().trim().max(120).default("inherit"),
  fontSize: z.number().int().min(16).max(72).default(32),
  speedPxPerSecond: z.number().int().min(40).max(480).default(140),
  messageLifetimeMs: z.number().int().min(4000).max(30000).default(12000),
  maxVisibleMessages: z.number().int().min(1).max(20).default(8),
  cardOpacity: z.number().min(0).max(1).default(0.78),
  accentColor: hexColorSchema.default("#34d399"),
  strokeColor: hexColorSchema.default("#0f172a"),
  backgroundColor: z.string().trim().max(64).default("rgba(2, 6, 23, 0.78)"),
  showSenderName: z.boolean().default(true),
});

export const defaultChatOverlayConfig = chatOverlayConfigSchema.parse({});

export const prizeBoardSettingsSchema = z.object({
  columns: z.number().int().min(1).max(12).default(4),
  minItemWidth: z.number().int().min(120).max(640).default(180),
  cardMinHeight: z.number().int().min(64).max(320).default(112),
  boardMaxWidth: z.number().int().min(480).max(3200).default(1440),
  gap: z.number().int().min(4).max(48).default(16),
  cleanGridGap: z.number().int().min(0).max(96).default(20),
  cleanGridPadding: z.number().int().min(0).max(160).default(40),
  fontFamily: z.string().trim().max(120).default("inherit"),
  winnerLabelFontSize: z.number().int().min(8).max(72).default(11),
  fontSize: z.number().int().min(16).max(160).default(34),
  numberFontSize: z.number().int().min(16).max(200).default(34),
  fontWeight: z.number().int().min(400).max(900).default(700),
  pageBackgroundMode: z.enum(["transparent", "color"]).default("transparent"),
  pageBackgroundColor: hexColorSchema.default("#000000"),
  gridBackgroundMode: z.enum(["transparent", "color"]).default("transparent"),
  gridBackgroundColor: hexColorSchema.default("#000000"),
  emptyCardBackgroundColor: hexColorSchema.default("#000000"),
  rollingCardBackgroundColor: hexColorSchema.default("#000000"),
  revealedCardBackgroundColor: hexColorSchema.default("#ffffff"),
  confirmedCardBackgroundColor: hexColorSchema.default("#ffffff"),
  cardBorderColor: hexColorSchema.default("#1e293b"),
  rollingBorderColor: hexColorSchema.default("#fbbf24"),
  revealedBorderColor: hexColorSchema.default("#ef4444"),
  confirmedBorderColor: hexColorSchema.default("#34d399"),
  numberColor: hexColorSchema.default("#ef4444"),
  confirmedNumberColor: hexColorSchema.default("#064e3b"),
  rollingNumberColor: hexColorSchema.default("#ffffff"),
  waitingTextColor: hexColorSchema.default("#ffffff"),
});

export const themeSettingsSchema = z.object({
  backgroundType: backgroundTypeSchema.default("color"),
  backgroundImageUrl: optionalStringSchema,
  logoUrl: optionalStringSchema,
  backgroundColorStart: hexColorSchema.default("#0f172a"),
  backgroundColorEnd: hexColorSchema.default("#020617"),
  backgroundColorMode: backgroundColorModeSchema.default("gradient"),
  accentColor: hexColorSchema.default("#34d399"),
  textColor: hexColorSchema.default("#f8fafc"),
  mutedTextColor: hexColorSchema.default("#94a3b8"),
  surfaceTint: z.string().trim().default("rgba(8, 15, 28, 0.72)"),
  overlayMode: z.boolean().default(false),
  displayStyle: z.enum(["broadcast", "cinematic", "minimal"]).default("broadcast"),
  motionProfile: z.enum(["calm", "dynamic"]).default("dynamic"),
  backgroundFit: backgroundFitSchema.default("cover"),
  backgroundPosition: backgroundPositionSchema.default("center"),
  overlayOpacity: z.number().min(0).max(1).default(0.72),
  logoScale: z.number().min(0.5).max(2).default(1),
  logoPosition: logoPositionSchema.default("top_right"),
  contentAlignment: contentAlignmentSchema.default("left"),
  showMetaPanel: z.boolean().default(true),
  showSceneLabel: z.boolean().default(true),
  panelStyle: panelStyleSchema.default("glass"),
  heroImageBehavior: heroImageBehaviorSchema.default("poster"),
});

export const defaultThemeSettings = themeSettingsSchema.parse({});
export const defaultPrizeBoardSettings = prizeBoardSettingsSchema.parse({});
export const eventSettingsSchema = z.object({
  defaultMasterSource: masterDisplaySourceSchema.default("blank"),
  activeMasterSource: masterDisplaySourceSchema.default("blank"),
  requireActionConfirmations: z.boolean().default(true),
  persistLiveSelections: z.boolean().default(true),
  showRouteCopyButtons: z.boolean().default(true),
  fallbackPollingIntervalMs: z.number().int().min(1000).max(30000).default(2500),
  audienceChatEnabled: z.boolean().default(true),
  audienceChatSubmissionEnabled: z.boolean().default(true),
  audienceChatRequireName: z.boolean().default(false),
  audienceChatAutoApproveSafeMessages: z.boolean().default(true),
  audienceChatMaxLength: z.number().int().min(20).max(500).default(160),
  audienceChatCooldownSeconds: z.number().int().min(0).max(120).default(8),
  audienceChatPrompt: z.string().trim().max(160).default("Send a shout-out to the live audience wall."),
  audienceChatOverlay: chatOverlayConfigSchema.default({}),
});
export const defaultEventSettings = eventSettingsSchema.parse({});

export type TicketFormatSettings = z.infer<typeof ticketFormatSchema>;
export type ChatOverlayConfig = z.infer<typeof chatOverlayConfigSchema>;
export type PrizeBoardSettings = z.infer<typeof prizeBoardSettingsSchema>;
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
export type EventSettings = z.infer<typeof eventSettingsSchema>;
