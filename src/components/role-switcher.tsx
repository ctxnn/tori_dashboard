"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./client-api";
import { Arrow, cx } from "./ui";

export interface DemoUser {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  org: string;
  title: string;
  bio: string;
}

const ACCENT: Record<string, string> = {
  owner: "bg-vermilion",
  creator: "bg-pine",
  fan: "bg-gold",
  operator: "bg-info",
};

const DOES: Record<string, string> = {
  owner: "Publishes the kit, reviews proposals, sees royalties",
  creator: "Designs the product, sets the price, brings the audience",
  fan: "Preorders in test mode and tracks the order",
  operator: "Releases production, ships, refunds, reconciles",
};

export function RoleSwitcher({ users, currentId, next }: { users: DemoUser[]; currentId?: string; next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(u: DemoUser) {
    setBusy(u.id);
    setError(null);
    try {
      const r = await api<{ home: string }>("/api/session", { userId: u.id });
      router.push(next || r.home);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-sand border-y border-sand">
        {users.map((u) => {
          const current = u.id === currentId;
          return (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => choose(u)}
                disabled={!!busy}
                aria-current={current ? "true" : undefined}
                className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-1 py-4 text-left transition-colors hover:bg-card disabled:opacity-60 sm:grid-cols-[auto_220px_1fr_auto] sm:gap-6 sm:px-3"
              >
                <span className="relative grid h-11 w-11 place-items-center rounded-full bg-ink text-[13px] font-semibold text-paper">
                  {u.name.split(" ").map((p) => p[0]).join("")}
                  <span className={cx("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-paper", ACCENT[u.role])} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-ink">
                    {u.name}
                    {current && <span className="label ml-2 text-vermilion">· you</span>}
                  </span>
                  <span className="label mt-0.5 block text-moss">{u.roleLabel}</span>
                </span>
                <span className="hidden min-w-0 text-sm text-ink-2 sm:block">
                  {u.title}, {u.org}
                  <span className="block text-[13px] text-moss">{u.bio || DOES[u.role]}</span>
                </span>
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span className="hidden md:inline">{busy === u.id ? "Entering…" : current ? "Continue" : "Enter"}</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-sand-2 transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
                    <Arrow />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-3 text-sm text-fail" role="alert">{error}</p>}
    </div>
  );
}
