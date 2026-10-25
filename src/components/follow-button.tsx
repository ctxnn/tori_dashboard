"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./client-api";
import { cx } from "./ui";

export function FollowButton({ targetType, targetId, label, initial, signedInFan, dark = false }: { targetType: "kit" | "creator"; targetId: string; label: string; initial: boolean; signedInFan: boolean; dark?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (!signedInFan) {
      router.push("/switch?need=fan");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/follows", { targetType, targetId, on: !on });
      setOn(!on);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={on}
        className={cx(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors disabled:opacity-50",
          on
            ? dark ? "bg-paper text-ink" : "bg-ink text-paper"
            : dark ? "text-paper ring-1 ring-inset ring-paper/30 hover:ring-paper" : "text-ink ring-1 ring-inset ring-sand-2 hover:ring-ink",
        )}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M8 13.5S2 10 2 6a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5Z" strokeLinejoin="round" />
        </svg>
        {on ? `Following ${label}` : `Follow ${label}`}
      </button>
      {error && <span className="mt-1 text-xs text-fail" role="alert">{error}</span>}
    </span>
  );
}
