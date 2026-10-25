import type { Metadata, Viewport } from "next";
import { Averia_Serif_Libre, Geist, Geist_Mono, Inter, Instrument_Serif } from "next/font/google";
import "@fontsource/dela-gothic-one/400.css";
import "@fontsource-variable/hanken-grotesk";
import "./globals.css";
import "./v2.css";
import { ensureSeeded } from "@/lib/seed";
import { uiMode } from "@/lib/ui-mode";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });
// The new look: Inter for everything, Averia Serif Libre for the friendly accent words.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const averia = Averia_Serif_Libre({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-averia", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Torii — official Japanese IP in India, from fandom to revenue", template: "%s · Torii" },
  description:
    "Torii brings official Japanese manga and merchandise to Indian fans, and gives Japanese IP owners and Indian creators one shared workspace to approve, launch and track official collaborations.",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#f5f4ef", width: "device-width", initialScale: 1, viewportFit: "cover" };

export const dynamic = "force-dynamic";

/**
 * Three surfaces share this root, each with its own layout:
 *  (studio)  the collaboration workspace for IP owners, creators and Torii operations
 *  (fan)     the phone-first fan app: Read, Manga, Figures, Collabs, Shelf
 *  (partner) the Partner Portal where Japanese publishers bring their series
 * data-ui picks the workspace and portal look (see src/lib/ui-mode.ts); the fan app ignores it.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureSeeded();
  const ui = await uiMode();
  return (
    <html lang="en" data-ui={ui} className={`${geist.variable} ${geistMono.variable} ${instrument.variable} ${inter.variable} ${averia.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
