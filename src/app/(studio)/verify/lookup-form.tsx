"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Arrow, Button, Input } from "@/components/ui";

export function LookupForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim();
        if (c) router.push(`/verify/${encodeURIComponent(c.toUpperCase())}`);
      }}
      className="flex flex-col gap-2 sm:flex-row"
      aria-label="Check a tag"
    >
      <label htmlFor="tag-code" className="sr-only">Tag code</label>
      <Input id="tag-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SC-XXXX-XXXX" className="h-12 font-mono text-base uppercase tracking-[0.06em]" autoComplete="off" spellCheck={false} required />
      <Button type="submit" variant="accent" size="lg" className="shrink-0">Check <Arrow /></Button>
    </form>
  );
}
