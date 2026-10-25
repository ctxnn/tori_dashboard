"use client";
export default function SignOut({ className = "" }: { className?: string }) {
  return (
    <button className={className} onClick={async () => { await fetch("/api/partner/auth/logout", { method: "POST" }); location.href = "/partner/login"; }}>
      Sign out
    </button>
  );
}
