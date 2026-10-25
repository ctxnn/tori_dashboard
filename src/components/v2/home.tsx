import Link from "next/link";
import type { ReactNode } from "react";
import type { CampaignSummary } from "@/lib/domain/campaigns";
import type { LandingStats } from "@/lib/landing";
import { formatINR } from "@/lib/money";
import { CampaignTile } from "@/components/campaign-tile";
import { ResetDemo } from "@/components/reset-demo";
import { Preview } from "@/components/preview";
import { read } from "@/store/lib/db";
import { listCollabs } from "@/store/lib/collabs";
import { Cover } from "@/store/components/Art";
import { CollabTile } from "@/store/components/Collabs";
import { Sticker } from "./sticker";
import { CoverSticker, FolderSticker, GateSticker, HankoSticker, IndiaStamp, NameTag, PriceTag, QrTag, SakuraSticker } from "./sticker-art";
import { VideoWindow } from "./video-window";
import { V2Doors, type V2Door } from "./doors";

export interface V2HomeProps {
  featured: { title: string; svg: string; price: string; versionNo: number; hash: string; paid: number; threshold: number; creator: string; owner: string } | null;
  stats: LandingStats;
  ticker: string[];
  stages: { step: string; answer: string; body: string; figure: string; figureLabel: string; href: string; cta: string }[];
  royalty: string;
  published: CampaignSummary[];
  doors: V2Door[];
  others: { userId: string; name: string; role: string }[];
  currentId?: string;
}

/** The landing page in the new look: heyclicky's sticker desktop and windows, folk's soft cards and bubbles. */
export async function V2Home(p: V2HomeProps) {
  const db = await read();
  const since = Date.now() - 90 * 864e5;
  const reads = db.events.filter((e) => e.type === "read" && Date.parse(e.createdAt) > since).length;
  const shelf = [...db.series].sort((a, b) => Number(!!b.demoProperty) - Number(!!a.demoProperty) || b.popularity - a.popularity).slice(0, 6);
  const collabs = listCollabs();
  const collab = collabs.find((c) => c.open) ?? collabs[0];
  const f = p.featured;

  return (
    <div>
      {/* ---------------------------------------------------------------- hero */}
      <section className="bleed relative -mt-10 overflow-hidden pb-10 pt-14 sm:-mt-12 sm:pt-20">
        <div className="dots absolute inset-0 [mask-image:linear-gradient(black_60%,transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* the sticker desktop */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] [&>*]:pointer-events-auto" aria-hidden>
            <Sticker className="left-[4%] top-[2%] max-sm:left-[1%] max-sm:scale-[0.62]" rotate={-6} delay={1}>
              <NameTag />
            </Sticker>
            <Sticker className="left-[21%] top-[-2%] hidden md:block" rotate={8} delay={3} cut={false}>
              <CoverSticker src="/store/sky-courier-cover.svg" alt="" width={86} />
            </Sticker>
            <Sticker className="left-[9%] top-[50%] hidden md:block" rotate={-10} delay={2}>
              <FolderSticker />
            </Sticker>
            <Sticker className="left-[2%] top-[78%] hidden lg:block" rotate={6} delay={4}>
              <SakuraSticker />
            </Sticker>
            <Sticker className="right-[20%] top-[1%] hidden md:block" rotate={-4} delay={2.5}>
              <GateSticker size={64} />
            </Sticker>
            <Sticker className="right-[3%] top-[6%] max-sm:right-[1%] max-sm:scale-[0.6]" rotate={7} delay={0.5}>
              {f ? (
                <div className="w-[128px] overflow-hidden rounded-[12px] bg-white p-1">
                  <Preview svg={f.svg} className="overflow-hidden rounded-[8px]" />
                </div>
              ) : (
                <IndiaStamp />
              )}
            </Sticker>
            <Sticker className="right-[11%] top-[52%] hidden md:block" rotate={-8} delay={3.5}>
              <HankoSticker />
            </Sticker>
            <Sticker className="right-[1%] top-[76%] hidden lg:block" rotate={10} delay={1.5}>
              {f ? <PriceTag price={f.price.replace(".00", "")} /> : <QrTag />}
            </Sticker>
            <Sticker className="left-[15%] top-[88%] hidden lg:block" rotate={-3} delay={5}>
              <IndiaStamp />
            </Sticker>
          </div>

          <div className="relative mx-auto flex max-w-2xl flex-col items-center pt-[120px] text-center sm:pt-[132px]">
            <h1 className="text-[76px] leading-[0.95] tracking-[-0.06em] sm:text-[112px]">
              torii<span className="ml-1 align-top text-[16px] font-normal tracking-normal text-black/40 sm:text-[20px]" lang="ja">鳥居</span>
            </h1>
            <p className="mt-4 text-[19px] tracking-[-0.03em] sm:text-[21px]">official japanese ip, made with indian creators</p>
            <p className="mt-2 max-w-md text-[15px] leading-snug tracking-[-0.02em] text-black/55">
              kits from japan, merch designed in india, paid for by fans before a single piece is made.
            </p>
            <div className="mt-8 grid w-full max-w-[520px] gap-4 sm:grid-cols-2">
              <div className="flex flex-col items-center">
                <a href="#enter" className="gel gel-aqua inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-[17px]">
                  <GateGlyph /> enter the workspace
                </a>
                <span className="mt-2 text-[12.5px] text-black/45">pick a role. no sign-up.</span>
              </div>
              <div className="flex flex-col items-center">
                <Link href="/read" className="gel gel-white inline-flex h-12 w-full items-center justify-center gap-2 px-6 text-[17px]">
                  <BookGlyph /> open the fan app
                </Link>
                <span className="mt-2 text-[12.5px] text-black/45">{db.series.length} series · official manga</span>
              </div>
            </div>
          </div>

          <div className="relative mt-14">
            <VideoWindow src="/demo-videos/torii-full-walkthrough.mp4" poster="/demo-videos/owner.jpg" title="torii-walkthrough.mov" caption="the whole flow, start to finish" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- the flow, as chats */}
      <section aria-labelledby="flow" className="pt-24">
        <h2 id="flow" className="sr-only">How a collaboration happens</h2>
        <div className="divide-y divide-dashed divide-black/15">
          <FlowRow
            title="japan hands over a kit, once"
            body="the ip owner publishes artwork, colours and the rules: which products, where, and at what price. every proposal is checked against them automatically."
            window={`${f?.owner ?? "Kumo Lantern Studio"} · kit`}
            tint="pink"
          >
            <Them who="Haruka · IP owner">here’s the sky courier kit. art, colours, and the rules.</Them>
            <Me>kit published ✓ every proposal will be checked against it</Me>
            <Them who="Haruka · IP owner">perfect. send me the good ones 🙏</Them>
          </FlowRow>
          <FlowRow
            flip
            title="an indian creator makes it theirs"
            body="creators design inside the rules for their own audience. the owner approves one exact version; change anything and it needs a fresh approval."
            window={`${f?.creator ?? "Riya"} · proposal`}
            tint="green"
          >
            <Them who={`${f?.creator ?? "Riya"} · creator`}>made a {f ? `“${f.title}”` : "tee"} from the kit. {f?.price.replace(".00", "") ?? ""}</Them>
            <Me>rule checks passed. sent to Haruka for approval</Me>
            <Them who="Haruka · IP owner">approved v{f?.versionNo ?? 1} ✓</Them>
            <Me>locked to hash {f?.hash.slice(0, 10) ?? "…"}. any edit needs a new approval</Me>
          </FlowRow>
          <FlowRow
            title="fans pay before anything is made"
            body="each run has a production gate. fans preorder; if the gate fills it gets made, and if it doesn’t, everyone is refunded in full."
            window="Aarav · preorder"
            tint="yellow"
          >
            <Them who="Aarav · fan">i’m in 🙌 size M please</Them>
            <Me>
              paid {f?.price.replace(".00", "") ?? ""}. {f ? `${f.paid} of ${f.threshold}` : "backers"} so far
            </Me>
            <Me>made only if it fills. otherwise a full refund, automatically</Me>
          </FlowRow>
          <FlowRow
            flip
            title="every rupee, reconciled"
            body="torii releases production, ships and refunds. each delivered unit pays the licensor, the creator and the seller, and the statement balances to the paisa."
            window="Meera · operations"
            tint="blue"
          >
            <Them who="Meera · Torii ops">gate reached → released to production</Them>
            <Me>{p.royalty} to the licensor so far</Me>
            <Me>{p.stats.paidTwice === 0 ? "0 orders charged twice. ledger checked just now" : `${p.stats.paidTwice} orders charged twice. look at the proof page`}</Me>
          </FlowRow>
        </div>
      </section>

      {/* ------------------------------------------------ the brief, as cards */}
      <section aria-labelledby="brief" className="pt-24">
        <div className="text-center">
          <Pill>the jetro brief</Pill>
          <h2 id="brief" className="mt-4 text-[34px] leading-[1.05] sm:text-[48px]">
            four problems, <span className="font-serif text-[#2d5bd2]">one place</span>
          </h2>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {p.stages.map((s, i) => (
            <li key={s.step} className="soft-card relative flex min-h-[250px] flex-col p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="sticker">{[<IndiaStamp key="a" />, <FolderSticker key="b" label="kit" />, <PriceTag key="c" price={f?.price.replace(".00", "") ?? "₹999"} />, <QrTag key="d" />][i]}</div>
                <span className="bubble bubble-me mt-6 text-right">
                  <b className="font-semibold">{s.figure}</b> {s.figureLabel}
                </span>
              </div>
              <div className="mt-auto pt-6">
                <div className="text-[12.5px] text-black/45">{s.step.toLowerCase()}</div>
                <h3 className="mt-1 font-serif text-[22px] !font-bold leading-tight tracking-[-0.03em]">{s.answer.toLowerCase()}</h3>
                <p className="mt-1.5 text-[14.5px] leading-snug tracking-[-0.01em] text-black/60">{s.body}</p>
                <Link href={s.href} className="mt-3 inline-block text-[14px] font-medium text-[#2d5bd2] hover:underline">
                  {s.cta.toLowerCase()} →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------------- live ledger */}
      <section aria-labelledby="ledger" className="pt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="ledger" className="text-[30px] leading-tight sm:text-[40px]">
              not a mock-up. <span className="font-serif text-black/45">a working ledger.</span>
            </h2>
            <p className="mt-2 text-[15px] tracking-[-0.01em] text-black/55">counted live from this demo’s database · simulated test-mode money</p>
          </div>
          <Link href="/proof" className="gel gel-white inline-flex h-10 items-center px-5 text-[14.5px]">
            see the full proof
          </Link>
        </div>
        <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              [p.stats.orders.toLocaleString("en-IN"), "paid preorders", "each tied to one approved version"],
              [formatINR(p.stats.capturedMinor).replace(".00", ""), "collected in test mode", `${p.stats.refunds} refunds reconciled`],
              [String(p.stats.duplicates), "duplicate payment events", "recognised and ignored"],
              [String(p.stats.paidTwice), "orders charged twice", "checked against the ledger, right now"],
            ] as const
          ).map(([v, k, note], i) => (
            <div key={k} className="rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.05)]">
              <dd className={`text-[44px] font-medium leading-none tracking-[-0.055em] tabular-nums ${i === 3 ? "text-[#2d5bd2]" : ""}`}>{v}</dd>
              <dt className="mt-3 text-[15px] font-medium tracking-[-0.02em]">{k}</dt>
              <div className="mt-0.5 text-[13px] text-black/50">{note}</div>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------ fan app */}
      <section aria-labelledby="fan-app" className="pt-24">
        <div className="soft-card grid items-center gap-10 overflow-hidden p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:p-14">
          <div>
            <Pill>the fan app</Pill>
            <h2 id="fan-app" className="mt-4 text-[34px] leading-[1.02] sm:text-[48px]">
              where fans read, buy <span className="font-serif text-[#2d5bd2]">and back the next drop</span>
            </h2>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed tracking-[-0.01em] text-black/60">
              the collabs made here sell inside torii’s fan app, right next to the series they come from. official chapters in five indian languages, india-printed volumes, licensed figures, and a tag on every item that proves it’s real.
            </p>
            <dl className="mt-7 flex flex-wrap gap-2">
              {[
                [String(db.series.length), "series"],
                [reads.toLocaleString("en-IN"), "chapters read in 90 days"],
                [String(collabs.length), "official collabs"],
              ].map(([v, k]) => (
                <div key={k} className="bubble bubble-them">
                  <dd className="inline font-semibold">{v}</dd> <dt className="inline text-black/60">{k}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/read" className="gel gel-black inline-flex h-11 items-center px-5 text-[15px]">
                open the fan app
              </Link>
              <Link href="/partner" className="gel gel-white inline-flex h-11 items-center px-5 text-[15px]">
                partner portal <span className="ml-1.5 text-[12px] text-black/50" lang="ja">出版社の方へ</span>
              </Link>
            </div>
          </div>
          {/* the phone, drawn with the fan app's own components and look */}
          <div className="relative mx-auto w-full max-w-[340px]">
            <div className="store-root fan-skin rounded-[46px] border-[10px] border-[#0c0c0f] shadow-[0_30px_60px_-20px_rgba(20,40,100,0.45)]" aria-label="The Torii fan app">
              <div className="overflow-hidden rounded-[36px] bg-[rgb(var(--paper))]" data-section="read">
                <div className="flex items-center gap-2 px-5 pb-2 pt-4">
                  <span className="font-display text-[17px] leading-none">Torii</span>
                  <span className="rounded-full bg-card/70 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ring-fg/10">Read</span>
                </div>
                <div className="px-5 pb-5">
                  <div className="h-section text-[15px]">Top in India today</div>
                  <ul className="mt-2 grid grid-cols-3 gap-2">
                    {shelf.map((s) => (
                      <li key={s.id}>
                        <Cover title={s.title} color={s.color} image={s.image} size="sm" />
                        <div className="mt-1 truncate text-[10.5px] font-semibold">{s.title}</div>
                      </li>
                    ))}
                  </ul>
                  {collab && (
                    <div className="mt-4 rounded-[14px] bg-card p-3 ring-1 ring-inset ring-fg/10" data-section="collabs">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent">Official collab · made in India</div>
                      <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                        <CollabTile c={collab} />
                        <p className="text-[12px] leading-snug text-muted">
                          Designed by {collab.creator} from the {collab.property} kit. Made only if {collab.threshold} fans pay.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Sticker className="-left-8 -top-6" rotate={-10} delay={2}>
              <QrTag />
            </Sticker>
            <Sticker className="-bottom-4 -right-6" rotate={8} delay={1}>
              <SakuraSticker size={64} />
            </Sticker>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- on the wall */}
      {p.published.length > 0 && (
        <section aria-labelledby="wall" className="pt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="wall" className="text-[30px] leading-tight sm:text-[40px]">
              on the wall <span className="font-serif text-black/45">right now</span>
            </h2>
            <Link href="/campaigns" className="gel gel-white inline-flex h-10 items-center px-5 text-[14.5px]">
              every campaign
            </Link>
          </div>
          <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {p.published.slice(0, 3).map((s, i) => (
              <li key={s.campaign.id}>
                <CampaignTile s={s} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------- what just happened */}
      {p.ticker.length > 0 && (
        <section aria-labelledby="activity" className="pt-24">
          <div className="text-center">
            <Pill>live</Pill>
            <h2 id="activity" className="mt-4 text-[34px] leading-[1.05] sm:text-[48px]">what just happened</h2>
            <p className="mt-3 text-[16px] tracking-[-0.02em] text-black/55">straight from the audit log. nothing on this page is typed in by hand.</p>
          </div>
          <div className="relative mt-10">
            <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {p.ticker.slice(0, 9).map((line, i) => (
                <li key={line} className="win mb-4 break-inside-avoid">
                  <div className="win-bar" data-tint={(["blue", "green", "yellow", "pink"] as const)[i % 4]}>
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fbe6e3]">
                        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="#e8402f" aria-hidden>
                          <path d="M1.5 5.2 Q16 9.6 30.5 5.2 L29.6 8.6 Q16 11.6 2.4 8.6 Z" />
                          <rect x="4.6" y="13" width="22.8" height="2.4" rx="0.4" />
                          <rect x="7.6" y="9.6" width="2.8" height="19.4" rx="0.4" />
                          <rect x="21.6" y="9.6" width="2.8" height="19.4" rx="0.4" />
                        </svg>
                      </span>
                      <span className="leading-tight">
                        <span className="block text-[14px] font-medium tracking-[-0.02em]">torii ledger</span>
                        <span className="block text-[12.5px] text-black/45">@audit-log</span>
                      </span>
                    </div>
                    <p className="mt-3 text-[15px] leading-snug tracking-[-0.01em]">{line}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f5f5f5] to-transparent" aria-hidden />
          </div>
          <p className="relative -mt-6 text-center text-[17px] font-medium tracking-[-0.02em]">
            every line is a real row in this demo.{" "}
            <Link href="/proof" className="text-[#2d5bd2] underline underline-offset-2">
              see the proof
            </Link>
          </p>
        </section>
      )}

      <V2Doors doors={p.doors} others={p.others} currentId={p.currentId} />

      {/* --------------------------------------------------------------- faq */}
      <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl scroll-mt-20 pt-24">
        <div className="text-center">
          <Pill>FAQ</Pill>
          <h2 id="faq-title" className="mt-4 text-[34px] leading-[1.05] sm:text-[44px]">frequently asked questions</h2>
          <p className="mt-3 text-[16px] tracking-[-0.02em] text-black/55">what torii is, what’s real in this demo, and where the money goes.</p>
        </div>
        <div className="mt-10 space-y-3">
          {FAQ.map(([q, a], i) => (
            <details key={q} className="faq group rounded-[12px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.05)]" open={i === 0}>
              <summary className="flex items-center justify-between gap-4 px-5 py-4 text-[16px] font-medium tracking-[-0.02em]">
                {q}
                <svg viewBox="0 0 16 16" className="faq-plus h-4 w-4 shrink-0 transition-transform" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M8 2.5v11M2.5 8h11" strokeLinecap="round" />
                </svg>
              </summary>
              <p className="px-5 pb-5 text-[15px] leading-relaxed tracking-[-0.01em] text-black/60">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ closing */}
      <section aria-labelledby="closing" className="bleed relative mt-24 overflow-hidden py-24">
        <div className="dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 id="closing" className="text-[38px] leading-[1.02] sm:text-[60px]">
            small enough to start. <span className="font-serif text-[#2d5bd2]">strict enough to trust.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed tracking-[-0.01em] text-black/55">
            we think reusable kits, exact approvals and honest reporting make small creator collaborations worth an ip owner’s time. this prototype shows the workflow end to end; a pilot with a real partner is how we find out.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#enter" className="gel gel-blue inline-flex h-12 items-center px-6 text-[16px]">
              try it as a role
            </a>
            <Link href="/how-it-works" className="gel gel-white inline-flex h-12 items-center px-6 text-[16px]">
              watch the films
            </Link>
          </div>
        </div>
      </section>

      <section id="reset" aria-labelledby="reset-title" className="scroll-mt-24 pt-10">
        <div className="grid gap-6 rounded-[20px] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.05)] lg:grid-cols-[320px_1fr]">
          <div>
            <h2 id="reset-title" className="text-[17px]">reset the demo</h2>
            <p className="mt-1 text-sm text-black/55">restores the seeded kit, campaigns, simulated orders and ledger. only touches this local database and its uploads folder.</p>
          </div>
          <ResetDemo />
        </div>
      </section>
    </div>
  );
}

const FAQ: [string, string][] = [
  ["what is torii?", "a workspace where japanese ip owners and indian creators make official merch together, plus a fan app where indian fans read manga, buy volumes and figures, and back those collabs before they’re made."],
  ["is any of this real?", "the workflow is: approvals, test-mode payments, refunds and the ledger all run end to end. the property (Sky Courier), the partners and the commercial terms are fictional."],
  ["what if a run doesn’t reach its gate?", "nothing gets made, and every backer is refunded in full, automatically. the creator and the owner never carry unsold stock."],
  ["how does the ip owner stay in control?", "they publish a kit with rules once. every proposal is checked against it, and they approve one exact version. any later edit needs a fresh approval."],
  ["how do fans know it’s official?", "every item ships with a tag. scan it, or type the code at /verify, to see the approved version it came from."],
  ["where does the money go?", "each delivered unit splits between the licensor, the creator and the seller, and the statement reconciles to the paisa. the proof page shows every figure."],
  ["who is the fan app for?", "indian manga readers: official chapters in five indian languages, india-printed volumes, licensed figures and these collabs, in one app."],
];

function Pill({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-full border border-black/15 bg-white/70 px-3 py-1 text-[12.5px] font-medium tracking-[-0.01em] text-black/60">{children}</span>;
}

function FlowRow({ title, body, window, tint, flip, children }: { title: string; body: string; window: string; tint: "pink" | "green" | "yellow" | "blue"; flip?: boolean; children: ReactNode }) {
  return (
    <div className="grid items-center gap-8 py-12 first:pt-0 md:grid-cols-2 md:gap-14">
      <div className={flip ? "md:order-2" : ""}>
        <h3 className="text-[26px] leading-tight sm:text-[30px]">{title}</h3>
        <p className="mt-3 max-w-md text-[16px] leading-relaxed tracking-[-0.015em] text-black/60">{body}</p>
      </div>
      <div className="win">
        <div className="win-bar" data-tint={tint}>
          <i />
          <i />
          <i />
          <span>{window}</span>
        </div>
        <div className="flex flex-col gap-2.5 bg-[linear-gradient(#fff,#fafbfd)] p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function Them({ who, children }: { who: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start">
      <span className="mb-1 ml-1 text-[11.5px] text-black/45">{who}</span>
      <span className="bubble bubble-them">{children}</span>
    </div>
  );
}

function Me({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <span className="bubble bubble-me">{children}</span>
    </div>
  );
}

function GateGlyph() {
  return (
    <svg viewBox="0 0 32 32" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <path d="M1.5 5.2 Q16 9.6 30.5 5.2 L29.6 8.6 Q16 11.6 2.4 8.6 Z" />
      <rect x="4.6" y="13" width="22.8" height="2.4" rx="0.4" />
      <rect x="7.6" y="9.6" width="2.8" height="19.4" rx="0.4" />
      <rect x="21.6" y="9.6" width="2.8" height="19.4" rx="0.4" />
    </svg>
  );
}

function BookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
      <path d="M8 7h7" />
    </svg>
  );
}
