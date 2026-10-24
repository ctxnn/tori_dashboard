"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "./client-api";
import { Button, Input } from "./ui";

export function ResetDemo() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      await api("/api/demo/reset", { confirm: value.trim().toLowerCase() });
      setState("done");
      setMessage("Demo data restored. All campaigns, orders and uploads are back to their starting point.");
      setValue("");
      router.refresh();
    } catch (err) {
      setState("error");
      setMessage((err as Error).message);
    }
  }

  return (
    <form onSubmit={reset} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="reset-confirm" className="text-sm font-medium text-ink">
          Type <span className="font-mono">reset</span> to restore the demo data
        </label>
        <Input id="reset-confirm" value={value} onChange={(e) => setValue(e.target.value)} placeholder="reset" autoComplete="off" className="mt-1.5" />
      </div>
      <Button type="submit" variant="danger" disabled={value.trim().toLowerCase() !== "reset" || state === "busy"}>
        {state === "busy" ? "Resetting…" : "Reset demo data"}
      </Button>
      {message && (
        <p className={`text-sm sm:basis-full ${state === "error" ? "text-fail" : "text-ok"}`} role="status">
          {message}
        </p>
      )}
    </form>
  );
}
