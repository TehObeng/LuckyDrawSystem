import { z } from "zod";

export const bidInputSchema = z.object({
  eventId: z.string().cuid(),
  lotId: z.string().cuid(),
  amount: z.number().nonnegative(),
  bidderLabel: z.string().optional(),
  enteredBy: z.string().default("operator"),
});

export type BidInput = z.infer<typeof bidInputSchema>;
