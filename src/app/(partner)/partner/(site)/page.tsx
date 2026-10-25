import Link from "next/link";
import { read } from "@/store/lib/db";
import { currentPartner } from "@/store/lib/partner-auth";
import { CHAPTER_PRICE, PARTNER_TERMS } from "@/store/lib/config";
import { LANGS } from "@/store/lib/types";
import { Cover } from "@/store/components/Art";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bring your manga to India" };

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function PartnerLanding() {
  const [db, me] = await Promise.all([read(), currentPartner()]);
  const since = Date.now() - 90 * 864e5;
  const recent = db.events.filter((e) => Date.parse(e.createdAt) > since);
  const reads = recent.filter((e) => e.type === "read").length;
  const states = new Set(recent.map((e) => e.state).filter((s) => s !== "Unknown")).size;
  const shelf = [...db.series].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  const unlockCut = (CHAPTER_PRICE * PARTNER_TERMS.unlockShare).toFixed(2);

  const steps = [
    { n: "01", en: "Join and get verified", ja: "参加登録・審査", body: "Create a company account and accept the standard terms. Torii checks your company and rights, usually within two working days." },
    { n: "02", en: "Submit a series", ja: "作品の申請", body: "Add the details, cover, licensed languages and rights, then upload chapters as images or a .cbz/.zip. Pages are optimised for Indian mobile data in your browser." },
    { n: "03", en: "Torii reviews it", ja: "審査", body: "Our team checks content, rights and page quality, and replies with approval or clear notes on what to change." },
    { n: "04", en: "Go live and grow", ja: "配信開始", body: "Chapters appear in the Read app, with simulpub scheduling, ₹9 unlocks, India-printed volumes and authenticity-tagged merchandise." },
  ];
  const terms: [string, string, string][] = [
    ["Chapter unlocks", pct(PARTNER_TERMS.unlockShare), `of every ₹${CHAPTER_PRICE} unlock (₹${unlockCut} to you)`],
    ["India-printed volumes", pct(PARTNER_TERMS.printShare), "of the cover price, when you license print"],
    ["Figures and merchandise", pct(PARTNER_TERMS.figureShare), "licensing royalty on each sale"],
    ["Statements", "Monthly", `paid ${PARTNER_TERMS.payoutDays} days after the month closes`],
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line paper-band">
        <div className="tone pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:py-20">
          <div>
            <div className="jp text-[14px] font-medium tracking-[.1em] text-accent">日本の出版社の皆さまへ</div>
            <h1 className="mt-3 font-display text-[clamp(34px,5.4vw,60px)] leading-[1.02]">Bring your manga to India, officially.</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed">
              Submit a series once. Torii localises it into {LANGS.length} Indian languages, sells chapters for ₹{CHAPTER_PRICE}, prints volumes in India,
              tags every product against counterfeits, and shows you exactly who is reading, state by state.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {me ? <Link href="/partner/dashboard" className="btn-primary text-[16px]">Open your console</Link> : <Link href="/partner/apply" className="btn-primary text-[16px]">Join the partner programme</Link>}
              {!me && <Link href="/partner/login" className="btn-ghost text-[16px]">Sign in</Link>}
            </div>
          </div>
          <div aria-hidden className="relative mx-auto grid w-full max-w-[420px] grid-cols-3 gap-3 [transform:rotate(-4deg)]">
            {shelf.map((s, i) => (
              <div key={s.id} className={i % 3 === 1 ? "translate-y-6" : ""}><Cover title={s.title} color={s.color} image={s.image} size="sm" /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[[db.series.length.toLocaleString("en-IN"), "series on Torii today"], [reads.toLocaleString("en-IN"), "chapters read in 90 days"],
            [String(states), "Indian states reading"], [String(LANGS.length), "languages: " + LANGS.map((l) => l.name).join(", ")]].map(([v, l]) => (
            <div key={l} className="card p-5"><div className="price font-display text-[34px] leading-none">{v}</div><div className="mt-2 text-[13.5px] text-muted">{l}</div></div>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-muted">Live figures from this prototype&apos;s store.</p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-8">
        <h2 className="font-display text-[28px]">How it works <span className="jp ml-2 text-[15px] font-normal text-muted">ご利用の流れ</span></h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="card relative p-5">
              <div className="font-display text-[30px] text-accent">{s.n}</div>
              <div className="mt-2 text-[17px] font-bold tracking-[-0.02em]">{s.en}</div>
              <div className="jp text-[12.5px] text-muted">{s.ja}</div>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="terms" className="scroll-mt-20 border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-[28px]">Standard partner terms <span className="jp ml-2 text-[15px] font-normal text-muted">契約条件</span></h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              One agreement covers every title you bring. You keep ownership of your works and choose, per title, which languages and rights
              (digital, print, merchandise) you license for India, for how long, and whether exclusively. Version {PARTNER_TERMS.version}.
            </p>
            <ul className="mt-5 space-y-2 text-[14.5px]">
              {["See reads, unlocks and sales by series, language, state and city", "“Translate next” tells you which language each region is waiting for",
                "Schedule chapters to release in India the moment they release in Japan", "Every print volume and figure carries a signed, scannable authenticity tag"].map((t) => (
                <li key={t} className="flex gap-2.5"><span className="mt-[3px] text-ok" aria-hidden>✓</span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-panel border border-line">
            <table className="w-full text-left text-[14.5px]">
              <thead className="bg-fg/[.03] text-[12.5px] text-muted"><tr><th className="px-4 py-3 font-semibold">Revenue stream</th><th className="px-4 py-3 font-semibold">Your share</th><th className="hidden px-4 py-3 font-semibold sm:table-cell">Notes</th></tr></thead>
              <tbody className="divide-y divide-line">
                {terms.map(([a, b, c]) => (
                  <tr key={a}><td className="px-4 py-3.5 font-semibold">{a}</td><td className="price px-4 py-3.5 text-[18px]">{b}</td><td className="hidden px-4 py-3.5 text-muted sm:table-cell">{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="panel flex flex-wrap items-center gap-6 p-6 sm:p-8">
          <div className="mr-auto max-w-xl">
            <h2 className="text-[22px] font-bold tracking-[-0.02em]">Try the demo</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
              Sign in as Shueisha with <b className="text-fg">partner@shueisha.example</b> and password <b className="text-fg">torii-demo</b>, or join as a new publisher.
              Torii staff review submissions in the reader app at <Link href="/publisher/review" className="font-semibold text-fg underline underline-offset-2">/publisher/review</Link> (phone 9999999999, OTP 123456).
            </p>
          </div>
          <Link href="/partner/login?demo=1" className="btn-ink">Sign in as Shueisha</Link>
        </div>
      </section>
    </div>
  );
}
