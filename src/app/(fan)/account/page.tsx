import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { read } from "@/store/lib/db";
import { requireUser } from "@/store/lib/auth";
import { TOPUPS } from "@/store/lib/payments";
import TopUp from "@/store/components/TopUp";
import LogoutButton from "@/store/components/LogoutButton";
import { inr } from "@/store/lib/format";
import { currentUser as studioUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "You" };

export default async function Account({ searchParams: searchParamsIn }: { searchParams: Promise<{ denied?: string }> }) { const searchParams = await searchParamsIn;
  const user = await requireUser("/account");
  const db = await read();
  const orders = db.orders.filter((o) => o.userId === user.id).length;
  const unlocks = db.unlocks.filter((u) => u.userId === user.id).length;
  const studio = await studioUser();
  const rows: [string, string, string][] = [
    ["/store/orders", "Orders", orders ? `${orders} placed` : "None yet"],
    ["/shelf", "My Shelf", `${unlocks} chapter${unlocks === 1 ? "" : "s"} unlocked`],
    ["/verify", "Check a product", "Scan its code"],
  ];
  if (user.isAdmin) rows.push(["/publisher", "Publisher dashboard", "Sales and reading data"], ["/publisher/review", "Partner review queue", "Titles from publishers"]);
  if (studio?.role === "fan") rows.splice(2, 0, ["/fan", "Fan passport", "Stamps for collabs you backed"]);
  if (user.isAdmin) rows.push(["/ops", "Collab operations", "Production, refunds, statements"]);
  rows.push(["/partner", "For publishers", "Partner Portal ↗"], ["/", "Torii workspace", "IP owners & creators ↗"]);
  return (
    <div className="space-y-6">
      {searchParams.denied && <p className="rounded-xl border border-bad/30 bg-bad/10 px-3 py-2.5 text-[14px] font-semibold text-bad">The publisher dashboard needs a publisher account.</p>}
      <section className="paper-band bleed relative -mt-5 overflow-hidden border-b border-line px-4 pb-6 pt-7 dark:border-line">
        <div className="tone pointer-events-none absolute -inset-y-12 inset-x-0 opacity-60" />
        <div className="relative">
          <h1 className="font-display text-[clamp(28px,8cqw,40px)] leading-none">{user.name || "Hello, reader"}</h1>
          {user.phone && <p className="mt-2 text-[14.5px] font-semibold">+91 {user.phone.replace(/(\d{5})(\d{5})/, "$1 $2")}{user.isAdmin ? ", publisher account" : ""}</p>}
          {studio && user.studioId === studio.id && (
            <p className="mt-2 text-[14px]">
              <span className="font-semibold">Demo person: {studio.name}, {ROLE_LABEL[studio.role]}.</span>{" "}
              <Link href="/switch" className="font-semibold text-accent underline underline-offset-2">Switch</Link>
            </p>
          )}
        </div>
      </section>
      <section aria-labelledby="wallet" className="panel p-5">
        <h2 id="wallet" className="label">Wallet</h2>
        <div className="price mt-1 text-[40px] leading-none">{inr(user.wallet)}</div>
        <p className="mb-4 mt-2 text-[14px] text-muted">Pay for chapters in one tap. Add money with UPI.</p>
        <TopUp amounts={TOPUPS} />
      </section>
      <nav className="card divide-y divide-line" aria-label="Your account">
        {rows.map(([href, l, d]) => (
          <Link key={href} href={href} className="flex min-h-[56px] items-center justify-between px-4 hover:bg-accentsoft/40">
            <span className="font-bold">{l}</span><span className="text-[13.5px] text-muted">{d}</span>
          </Link>
        ))}
      </nav>
      <LogoutButton />
      <RevealScope />
    </div>
  );
}
