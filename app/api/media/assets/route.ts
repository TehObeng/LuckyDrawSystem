import { z } from "zod";
import { createMediaAssetRecord } from "@/modules/shared/commands/platform-commands";
import { getCurrentOperator } from "@/lib/auth/operator";

export const dynamic = "force-dynamic";

const mediaAssetRequestSchema = z.object({
  eventId: z.string().optional(),
  kind: z.enum(["background", "logo", "supporting"]),
  publicUrl: z.string().min(1),
  bucket: z.string().optional(),
  path: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.object({
    title: z.string().optional(),
    altText: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
    focalPoint: z.object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
    }).optional(),
  }).default({ tags: [] }),
});

export async function POST(request: Request) {
  const operator = await getCurrentOperator();
  if (!operator) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = mediaAssetRequestSchema.safeParse(await request.json());
  if (!body.success) {
    return Response.json({ error: "Invalid media asset payload." }, { status: 400 });
  }

  try {
    const asset = await createMediaAssetRecord(body.data, operator.displayName);
    return Response.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save media asset.";
    return Response.json({ error: message }, { status: 500 });
  }
}
