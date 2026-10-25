"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Field, Input, Notice, Textarea } from "@/components/ui";

export function UploadAsset({ kitId }: { kitId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "fail"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.set("file", file);
    form.set("name", name);
    form.set("description", description);
    try {
      const res = await fetch(`/api/kits/${kitId}/assets`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setMessage({ tone: "ok", text: `Uploaded as ${data.asset.code}. Include it in the next kit version to make it available.` });
      setName("");
      setDescription("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setMessage({ tone: "fail", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-dashed border-sand-2 bg-ivory/50 p-4">
      <div className="text-sm font-semibold">Upload artwork</div>
      <Field label="File" htmlFor="asset-file" hint="PNG, JPEG, WebP or SVG up to 5 MB. Scripts are rejected.">
        <input
          ref={fileRef}
          id="asset-file"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !name) setName(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
          }}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-pine file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-paper"
        />
      </Field>
      <Field label="Name" htmlFor="asset-name">
        <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Usage note" htmlFor="asset-desc" optional>
        <Textarea id="asset-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </Field>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" disabled={busy || !file || !name.trim()} className="w-full">
        {busy ? "Uploading…" : "Upload to library"}
      </Button>
    </form>
  );
}
