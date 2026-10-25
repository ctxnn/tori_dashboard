"use client";
export default function LogoutButton() {
  return <button className="btn-ghost w-full text-muted" onClick={async () => { await fetch("/api/store/auth/logout", { method: "POST" }); location.href = "/read"; }}>Sign out</button>;
}
