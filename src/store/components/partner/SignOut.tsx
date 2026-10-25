"use client";
import { useT } from "@/components/i18n-client";

export default function SignOut({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <button className={className} onClick={async () => { await fetch("/api/partner/auth/logout", { method: "POST" }); location.href = "/partner/login"; }}>
      {t("Sign out", "ログアウト")}
    </button>
  );
}
