import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import AppShell from "@/store/components/AppShell";
import SWRegister from "@/store/components/SWRegister";
import NavProgress from "@/store/components/NavProgress";
import DesktopAside from "@/store/components/DesktopAside";
import { currentUser } from "@/store/lib/auth";
import { read } from "@/store/lib/db";
import { APP_TAGLINE } from "@/store/lib/config";
import { uiMode } from "@/lib/ui-mode";

export const metadata: Metadata = {
  title: { default: "Torii", template: "%s | Torii" },
  description: APP_TAGLINE,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Torii", statusBarStyle: "default" },
};
// The phone's status bar matches the app: the soft grey of the new look, or the classic ink.
export async function generateViewport(): Promise<Viewport> {
  return { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: (await uiMode()) === "new" ? "#f5f5f5" : "#1a1625" };
}

/** The fan app: a phone-width column with its own header and bottom navigation. */
export default async function FanLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const cartCount = user ? (await read()).cart.filter((c) => c.userId === user.id).reduce((s, c) => s + c.qty, 0) : 0;
  return (
    <div className="store-root store-app flex-1 antialiased">
      <AppShell signedIn={!!user} cartCount={cartCount} wallet={user?.wallet ?? 0} credit>{children}</AppShell>
      <DesktopAside />
      <SWRegister />
      <Suspense fallback={null}><NavProgress /></Suspense>
    </div>
  );
}
