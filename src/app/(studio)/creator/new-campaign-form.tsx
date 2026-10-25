"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client-api";
import { Button, Field, Input, Select } from "@/components/ui";

export function NewCampaignForm({ kits }: { kits: { id: string; name: string; owner: string; version: number }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kitId, setKitId] = useState(kits[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ campaign: { id: string } }>("/api/campaigns", { kitId, title });
      router.push(`/creator/campaigns/${r.campaign.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Working title" htmlFor="nc-title">
        <Input id="nc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Exam Week Courier Tee" required minLength={4} maxLength={80} />
      </Field>
      <Field label="Licensed kit" htmlFor="nc-kit">
        <Select id="nc-kit" value={kitId} onChange={(e) => setKitId(e.target.value)}>
          {kits.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name} — {k.owner} (kit v{k.version})
            </option>
          ))}
        </Select>
      </Field>
      {error && <p className="text-sm text-fail" role="alert">{error}</p>}
      <Button type="submit" disabled={busy || title.trim().length < 4} className="w-full">
        {busy ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}
