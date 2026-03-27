import { z } from "zod";

export const luckyDrawRevealSchema = z.object({
  eventId: z.string().cuid(),
  prizeCategoryId: z.string().cuid(),
  drawSessionId: z.string().cuid(),
  ticketNumber: z.string().min(1),
  revealSource: z.enum(["manual", "digital_random"]).default("manual"),
  actor: z.string().default("operator"),
});

export type LuckyDrawRevealInput = z.infer<typeof luckyDrawRevealSchema>;
