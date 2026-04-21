"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface MediaAssetUploaderProps {
  eventId: string;
}

export function MediaAssetUploader({ eventId }: MediaAssetUploaderProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [kind, setKind] = useState<"background" | "logo" | "supporting">("supporting");
  const [bucket, setBucket] = useState<"event-assets" | "backgrounds" | "logos">("event-assets");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File) || !file.name) {
      setStatus({ type: "error", message: "Choose an image before uploading." });
      return;
    }

    setStatus({ type: "idle" });
    setIsPending(true);

    try {
      const uploadPayload = new FormData();
      uploadPayload.set("eventId", eventId);
      uploadPayload.set("kind", kind);
      uploadPayload.set("bucket", bucket);
      uploadPayload.set("title", title || file.name);
      uploadPayload.set("file", file);

      const uploadResponse = await fetch("/api/uploads/local", {
        method: "POST",
        body: uploadPayload,
      });

      if (!uploadResponse.ok) {
        const payload = await uploadResponse.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to save local media asset.");
      }

      setTitle("");
      const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }

      setStatus({ type: "success", message: "Image uploaded into the local asset library." });
      router.refresh();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-emerald-300">
          <UploadCloud className="size-4" />
        </div>
        <div>
          <p className="font-medium text-slate-100">Upload into asset library</p>
          <p className="text-sm text-slate-500">Files are saved directly into this app&apos;s local public uploads folder for themes, prizes, and lots.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assetKind">Asset kind</Label>
          <Select
            id="assetKind"
            value={kind}
            onChange={(nextEvent) => {
              const nextKind = nextEvent.target.value as "background" | "logo" | "supporting";
              setKind(nextKind);
              setBucket(nextKind === "background" ? "backgrounds" : nextKind === "logo" ? "logos" : "event-assets");
            }}
          >
            <option value="supporting">Supporting / doorprize</option>
            <option value="background">Theme background</option>
            <option value="logo">Logo mark</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assetBucket">Bucket</Label>
          <Select id="assetBucket" value={bucket} onChange={(nextEvent) => setBucket(nextEvent.target.value as "event-assets" | "backgrounds" | "logos")}>
            <option value="event-assets">event-assets</option>
            <option value="backgrounds">backgrounds</option>
            <option value="logos">logos</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assetTitle">Asset title</Label>
          <Input id="assetTitle" value={title} onChange={(nextEvent) => setTitle(nextEvent.target.value)} placeholder="Doorprize hero shot" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">Image file</Label>
          <Input id="file" name="file" type="file" accept="image/*" />
        </div>
      </div>

      {status.message ? (
        <div className={`rounded-[1.1rem] border px-3 py-3 text-sm ${status.type === "error" ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"}`}>
          {status.message}
        </div>
      ) : null}

      <Button type="submit" variant="secondary" className="w-full" disabled={isPending}>
        {isPending ? "Uploading..." : "Upload Image"}
      </Button>
    </form>
  );
}
