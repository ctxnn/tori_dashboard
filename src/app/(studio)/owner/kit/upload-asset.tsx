"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Field, Input, Notice, Textarea } from "@/components/ui";
import { useT } from "@/components/i18n-client";

export function UploadAsset({ kitId }: { kitId: string }) {
  const router = useRouter();
  const t = useT();
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
      if (!res.ok) throw new Error(data.error ?? t("Upload failed", "アップロードできませんでした"));
      setMessage({ tone: "ok", text: t(`Uploaded as ${data.asset.code}. Include it in the next kit version to make it available.`, `${data.asset.code}としてアップロードしました。次のキットのバージョンに含めると、クリエイターが利用できるようになります。`) });
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
      <div className="text-sm font-semibold">{t("Upload artwork", "素材をアップロード")}</div>
      <Field label={t("File", "ファイル")} htmlFor="asset-file" hint={t("PNG, JPEG, WebP or SVG up to 5 MB. Scripts are rejected.", "PNG・JPEG・WebP・SVG（5MBまで）に対応しております。スクリプトを含むファイルはお受けできません。")}>
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
      <Field label={t("Name", "名称")} htmlFor="asset-name">
        <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label={t("Usage note", "使用上の注意")} htmlFor="asset-desc" optional={t("Optional", "任意")}>
        <Textarea id="asset-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </Field>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" disabled={busy || !file || !name.trim()} className="w-full">
        {busy ? t("Uploading…", "アップロード中…") : t("Upload to library", "ライブラリにアップロード")}
      </Button>
    </form>
  );
}
