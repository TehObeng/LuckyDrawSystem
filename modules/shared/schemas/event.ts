import { z } from "zod";

export const ticketFormatSchema = z.object({
  mode: z.enum(["numeric", "alphanumeric"]).default("numeric"),
  fixedLength: z.number().int().positive().optional(),
  allowSeries: z.boolean().default(false),
  regex: z.string().optional(),
  preserveLeadingZeros: z.boolean().default(true),
});

export const eventSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  date: z.string(),
  supportsLuckyDraw: z.boolean().default(true),
  supportsAuction: z.boolean().default(true),
  duplicatePolicy: z.enum(["event", "category", "allow"]).default("event"),
  ticketFormat: ticketFormatSchema,
});
