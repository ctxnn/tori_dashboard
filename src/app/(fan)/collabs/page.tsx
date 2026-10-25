import Link from "next/link";
import RevealScope from "@/store/components/RevealScope";
import { CollabTile } from "@/store/components/Collabs";
import { listCollabs } from "@/store/lib/collabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collabs" };

/**
 * Official merchandise made in India: an Indian creator designs from the Japanese owner's
 * approved kit, the owner approves that exact version, and fans pay before anything is made.
 * The campaigns themselves live in the collaboration workspace; this is the fan's way in.
 */
export default async function CollabsHome() {
  const all = listCollabs();
  const open = all.filter((c) => c.open);
  const rest = all.filter((c) => !c.open);
  const backed = all.reduce((n, c) => n + c.paidUnits, 0);
  const creators = new Set(all.map((c) => c.creator)).size;

  return (
    <div className="space-y-8">
      <section className="paper-band bleed relative -mt-5 overflow-hidden border-b border-line px-4 pb-6 pt-7">
        <div className="tone pointer-events-none absolute -inset-y-12 inset-x-0 opacity-60" />
        <div className="relative">
          <p className="jp text-[13px] font-semibold text-accent">公式コラボ · Official collabs</p>
          <h1 className="mt-2 font-display text-[clamp(30px,9cqw,46px)] leading-[0.98]">Licensed in Japan. Made in India.</h1>
          <p className="mt-3 max-w-[38ch] text-[15px] leading-snug">
            Indian artists design merch from the original publisher’s kit, and the publisher approves every design. Pay now: it’s only made if enough fans join, or you get a full refund.
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-2">
            {[
              [open.length, "open now"],
              [backed, "units backed"],
              [creators, creators === 1 ? "creator" : "creators"],
            ].map(([v, k]) => (
              <div key={String(k)} className="rounded-xl bg-card/70 px-3 py-2.5 ring-1 ring-inset ring-fg/10">
                <dt className="sr-only">{k}</dt>
                <dd className="price text-[22px] leading-none">{v}</dd>
                <div className="mt-1 text-[12px] font-semibold text-muted">{k}</div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="how" className="panel p-4">
        <h2 id="how" className="h-section">How a collab works</h2>
        <ol className="mt-3 space-y-3 text-[14px] leading-snug">
          {[
            ["The publisher hands over a kit", "Original artwork plus the rules: which products, where, at what price."],
            ["A local creator makes it theirs", "They design inside those rules. The publisher approves one exact version."],
            ["Fans back it before it’s made", "Production starts when the gate fills. Miss it and everyone is refunded in full."],
          ].map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[28px_1fr] gap-2">
              <span className="font-display text-[20px] leading-none text-accent">{i + 1}</span>
              <span><span className="font-semibold">{t}.</span> <span className="text-muted">{d}</span></span>
            </li>
          ))}
        </ol>
      </section>

      {open.length > 0 && (
        <section aria-labelledby="open">
          <h2 id="open" className="h-section mb-3">Taking preorders</h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6">
            {open.map((c) => <li key={c.slug}><CollabTile c={c} wide /></li>)}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="rest">
          <h2 id="rest" className="h-section mb-3">Closed runs</h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6">
            {rest.map((c) => <li key={c.slug}><CollabTile c={c} /></li>)}
          </ul>
        </section>
      )}

      {!all.length && <div className="panel p-6 text-center"><p className="font-bold">No collabs are live right now.</p><p className="mt-1 text-[14px] text-muted">Follow a series to hear about the next drop first.</p></div>}

      <section className="rounded-panel bg-ink p-5 text-white dark:bg-card">
        <h2 className="font-display text-[22px] leading-tight">Make one yourself</h2>
        <p className="mt-2 text-[14px] leading-snug text-white/70">Creators and Japanese IP owners work together in the Torii workspace: kits, rule checks, approvals, and a statement that reconciles every rupee.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/switch" className="btn min-h-[42px] bg-white px-4 text-[14px] text-[rgb(24,21,34)]">Open the workspace</Link>
          <Link href="/how-it-works" className="btn min-h-[42px] px-4 text-[14px] text-white ring-1 ring-white/30">How it works</Link>
        </div>
      </section>
      <RevealScope />
    </div>
  );
}
