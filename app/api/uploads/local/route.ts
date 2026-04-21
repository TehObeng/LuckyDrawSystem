import { z } from "zod";
import { getCurrentOperator } from "@/lib/auth/operator";
import { isLocalBucket, saveLocalUpload } from "@/lib/storage/local-storage";
import { createMediaAssetRecord } from "@/modules/shared/commands/platform-commands";

export const dynamic = "force-dynamic";

const kindSchema = z.enum(["background", "logo", "supporting"]);

export async function POST(request: Request) {
  const operator = await getCurrentOperator();
  if (!operator) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const eventId = String(formData.get("eventId") ?? "").trim() || undefined;
  const kind = kindSchema.safeParse(formData.get("kind"));
  const bucket = String(formData.get("bucket") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!(file instanceof File) || !file.name) {
    return Response.json({ error: "Choose a file before uploading." }, { status: 400 });
  }

  if (!kind.success) {
    return Response.json({ error: "Invalid asset kind." }, { status: 400 });
  }

  if (!isLocalBucket(bucket)) {
    return Response.json({ error: "Invalid upload bucket." }, { status: 400 });
  }

  try {
    const upload = await saveLocalUpload({
      bucket,
      fileName: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });

    const asset = await createMediaAssetRecord(
      {
        eventId,
        kind: kind.data,
        publicUrl: upload.publicUrl,
        bucket: upload.bucket,
        path: upload.objectPath,
        mimeType: file.type || undefined,
        metadata: {
          title: title || file.name,
          altText: title || file.name,
          tags: [kind.data],
        },
      },
      operator.displayName,
    );

    return Response.json({ asset, upload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save local upload.";
    return Response.json({ error: message }, { status: 500 });
  }
}
