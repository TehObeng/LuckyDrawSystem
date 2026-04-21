import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const BUCKETS = ["event-assets", "backgrounds", "logos"] as const;
const SAFE_NAME_PATTERN = /[^a-zA-Z0-9._-]+/g;

export type LocalBucket = (typeof BUCKETS)[number];

export function isLocalBucket(value: string): value is LocalBucket {
  return BUCKETS.includes(value as LocalBucket);
}

function sanitizeFileName(fileName: string) {
  const extension = extname(fileName);
  const baseName = fileName.slice(0, Math.max(0, fileName.length - extension.length)) || "asset";
  const safeBaseName = baseName.replace(SAFE_NAME_PATTERN, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
  const safeExtension = extension.replace(SAFE_NAME_PATTERN, "");

  return `${safeBaseName}${safeExtension}`;
}

export async function saveLocalUpload(input: {
  bucket: LocalBucket;
  fileName: string;
  bytes: Uint8Array;
}) {
  const safeFileName = sanitizeFileName(input.fileName);
  const objectPath = `${randomUUID()}-${safeFileName}`;
  const targetDir = join(process.cwd(), "public", "uploads", input.bucket);

  await mkdir(targetDir, { recursive: true });
  await writeFile(join(targetDir, objectPath), input.bytes);

  return {
    bucket: input.bucket,
    objectPath,
    publicUrl: `/uploads/${input.bucket}/${objectPath}`,
  };
}
