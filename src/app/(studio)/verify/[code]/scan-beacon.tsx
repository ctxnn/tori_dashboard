"use client";

import { useEffect } from "react";

/** Logs one lookup per browser session, so refreshes don't inflate the count. */
export function ScanBeacon({ code }: { code: string }) {
  useEffect(() => {
    const key = `torii-scan:${code}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked: log anyway.
    }
    fetch(`/api/verify/${encodeURIComponent(code)}`, { method: "POST" }).catch(() => {});
  }, [code]);
  return null;
}
