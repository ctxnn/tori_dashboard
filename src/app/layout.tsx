import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { ROLE_LABEL } from "@/lib/labels";
import { ToriiMark } from "@/components/ui";
import { NavLinks } from "@/components/nav-links";
import { HeaderShell } from "@/components/header-shell";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Torii — official collaborations, made small", template: "%s · Torii" },
  description: "A shared workspace where Japanese IP owners and Indian creators prepare, approve, launch and track official merchandise collaborations.",
};

export const viewport: Viewport = { themeColor: "#f5f4ef", width: "device-width", initialScale: 1 };

export const dynamic = "force-dynamic";

const NAV: Record<string, { href: string; label: string }[]> = {
  owner: [
    { href: "/owner", label: "Overview" },
    { href: "/owner/kit", label: "Asset kit" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/proof", label: "Proof" },
    { href: "/how-it-works", label: "How it works" },
  ],
  creator: [
    { href: "/creator", label: "Studio" },
    { href: "/creator/kit", label: "Kit & rules" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/proof", label: "Proof" },
    { href: "/how-it-works", label: "How it works" },
  ],
  fan: [
    { href: "/campaigns", label: "Campaigns" },
    { href: "/fan", label: "My orders" },
    { href: "/proof", label: "Proof" },
    { href: "/how-it-works", label: "How it works" },
  ],
  operator: [
    { href: "/ops", label: "Operations" },
    { href: "/ops/payments", label: "Payment events" },
    { href: "/ops/settings", label: "Terms" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/proof", label: "Proof" },
    { href: "/how-it-works", label: "How it works" },
  ],
};

const ROLE_DOT: Record<string, string> = { owner: "bg-vermilion", creator: "bg-pine", fan: "bg-gold", operator: "bg-info" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureSeeded();
  const user = await currentUser();
  const links = user ? NAV[user.role] : [{ href: "/campaigns", label: "Campaigns" }, { href: "/proof", label: "Proof" }, { href: "/how-it-works", label: "How it works" }];
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        <div className="bg-ink text-paper/70">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] sm:px-6">
            <span className="truncate">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-vermilion align-middle" aria-hidden />
              Demo build · fictional property, partners &amp; terms · test-mode payments
            </span>
            <Link href="/#reset" className="shrink-0 text-paper/90 underline decoration-paper/30 underline-offset-2 hover:decoration-paper">
              Reset demo
            </Link>
          </div>
        </div>
        <HeaderShell>
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2.5 text-ink transition-colors group-data-[tone=dark]/header:text-paper" aria-label="Torii home">
              <ToriiMark className="h-[22px] w-[22px] text-vermilion" />
              <span className="text-[17px] font-semibold tracking-[-0.03em]">Torii</span>
            </Link>
            <NavLinks links={links} />
            <Link
              href="/switch"
              className="group ml-auto flex shrink-0 items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 text-sm transition-colors hover:bg-ivory group-data-[tone=dark]/header:hover:bg-paper/10"
              aria-label={user ? `Signed in as ${user.name}, ${ROLE_LABEL[user.role]}. Switch role` : "Choose a demo role"}
            >
              <span className="relative grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-semibold text-paper group-data-[tone=dark]/header:bg-paper group-data-[tone=dark]/header:text-ink">
                {user ? user.name.split(" ").map((p) => p[0]).join("") : "?"}
                {user && <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-paper group-data-[tone=dark]/header:border-ink ${ROLE_DOT[user.role]}`} aria-hidden />}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[13px] font-medium text-ink group-data-[tone=dark]/header:text-paper">{user ? user.name : "Choose a role"}</span>
                <span className="label block text-[9.5px] text-moss group-data-[tone=dark]/header:text-paper/50">{user ? ROLE_LABEL[user.role] : "Demo access"} · switch</span>
              </span>
            </Link>
          </div>
        </HeaderShell>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="border-t border-sand">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 text-xs text-moss sm:grid-cols-[auto_1fr] sm:gap-10 sm:px-6">
            <div className="flex items-center gap-2 text-ink">
              <ToriiMark className="h-4 w-4 text-vermilion" />
              <span className="font-semibold">Torii</span>
              <span className="label text-moss">Prototype · Thapar Japan Hackathon · JETRO</span>
            </div>
            <p className="sm:text-right">Rule checks enforce declared kit rules. They don’t establish copyright ownership or replace human judgement.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
