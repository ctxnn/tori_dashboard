import type { ReactNode } from "react";
import { buildProof, TARGETS } from "@/lib/domain/proof";
import { audienceInsights, defaultKitId } from "@/lib/domain/audience";
import { formatINR } from "@/lib/money";
import { fmtHours } from "@/lib/format";
import { ToriiMark } from "@/components/ui";
import { Fuji, Hanko } from "@/components/japan";
import { Deck, type Slide } from "./deck";

export const metadata = { title: "Pitch", description: "Torii in nine slides, with live numbers from the demo." };

function H({ children }: { children: ReactNode }) {
  return <h2 className="max-w-5xl text-[40px] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[64px] lg:text-[76px]">{children}</h2>;
}

function Big({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="border-t border-current/30 pt-4">
      <div className="font-mono text-[40px] font-semibold leading-none tracking-[-0.05em] sm:text-[56px]">{value}</div>
      <div className="mt-2 max-w-[220px] text-[14px] leading-snug opacity-75">{label}</div>
    </div>
  );
}

export default function PitchPage() {
  const p = buildProof();
  const kitId = defaultKitId();
  const a = kitId ? audienceInsights(kitId) : null;
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
  const claims = [
    p.operate.medianDecisionHours !== null && p.operate.medianDecisionHours <= TARGETS.decisionHours,
    p.operate.medianRounds !== null && p.operate.medianRounds <= TARGETS.roundsToApproval,
    p.operate.reviewedWithFailingRules === 0,
    p.reuse.campaignsPerKit >= TARGETS.campaignsPerKit,
    p.demand.hitRate !== null && p.demand.hitRate >= TARGETS.gateHitRate,
    p.integrity.chargedTwice === 0 && p.integrity.refundedTwice === 0 && p.integrity.ordersOnUnapprovedVersions === 0 && p.money.allReconciled,
    p.discover.beforeFirstLaunch >= TARGETS.signalsBeforeLaunch,
    p.retain.repeatRate !== null && p.retain.repeatRate >= TARGETS.repeatBackerRate,
    p.authentic.taggedShare !== null && p.authentic.taggedShare >= TARGETS.taggedShare,
  ];

  const slides: Slide[] = [
    {
      id: "cover",
      kicker: "Thapar Japan Hackathon · JETRO-PS-02",
      tone: "ink",
      body: (
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <ToriiMark className="h-10 w-10 text-[var(--torii-red,var(--color-vermilion))]" />
              <span className="text-[28px] font-semibold tracking-[-0.03em]">Torii</span>
            </div>
            <H>
              From fandom to revenue, <span className="font-serif font-normal italic text-vermilion">officially.</span>
            </H>
            <p className="mt-6 max-w-xl text-[18px] leading-relaxed opacity-70">A shared workspace where Japanese IP owners and Indian creators find demand, launch official merch, get paid, and keep fans coming back.</p>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[420px]">
            <div className="absolute inset-[8%] rounded-full bg-[var(--torii-red,var(--color-vermilion))]" />
            <Fuji className="absolute inset-x-0 bottom-0 h-[55%] w-full text-[#17201c]" snow="#f5f4ef" />
            <ToriiMark className="absolute bottom-0 left-1/2 h-[62%] w-[62%] -translate-x-1/2 text-ink" />
          </div>
        </div>
      ),
    },
    {
      id: "problem",
      kicker: "The problem",
      tone: "paper",
      body: (
        <div>
          <H>
            India loves the shows. <span className="font-serif font-normal italic text-vermilion">The money doesn’t follow.</span>
          </H>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              ["Licensors can’t see Indian demand", "Where are the fans, what would they buy, at what price? From Tokyo it’s guesswork — so most small deals never start."],
              ["Small collaborations cost too much", "Every creator proposal means emails, PDFs and re-checking the same rules. A ₹70,000 run isn’t worth that effort."],
              ["Fans can’t tell official from fake", "Bootleg merch fills the gap. Fans who want to support the studio have no way to check."],
            ].map(([t, d]) => (
              <div key={t} className="border-t border-ink pt-4">
                <div className="text-[20px] font-semibold tracking-[-0.02em]">{t}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "chain",
      kicker: "The brief’s own chain",
      tone: "ink",
      body: (
        <div>
          <H>Four stages. <span className="font-serif font-normal italic text-vermilion">One workspace.</span></H>
          <ol className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              ["Audience discovery", "Fan pulse + India demand map"],
              ["Localisation & distribution", "Asset kits for local creators, rules checked by the server"],
              ["Monetisation & merch", "Paid preorders with a production gate; royalties on delivery"],
              ["Community retention", "Passports, follows, backers’ day, verifiable tags"],
            ].map(([t, d], k) => (
              <li key={t} className="relative rounded-[14px] border border-paper/20 p-5">
                <div className="font-mono text-[13px] text-vermilion">0{k + 1}</div>
                <div className="mt-6 text-[20px] font-semibold leading-tight tracking-[-0.02em]">{t}</div>
                <p className="mt-2 text-[14px] leading-relaxed opacity-70">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      id: "discover",
      kicker: "01 · Audience discovery",
      tone: "indigo",
      live: { href: "/audience", label: "Audience map" },
      body: (
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <H>Know the demand <span className="font-serif font-normal italic text-sakura">before</span> you make anything.</H>
            <div className="mt-10 grid grid-cols-2 gap-6">
              <Big value={p.discover.signals} label={`fans answered the pulse, in ${p.discover.cities} cities`} />
              <Big value={pct(p.discover.conversionRate)} label="of them went on to pay for a run" />
            </div>
          </div>
          <ol className="space-y-4 self-center">
            {(a?.findings ?? []).slice(0, 4).map((f) => (
              <li key={f.title} className="rounded-[12px] bg-paper/10 p-4">
                <div className="text-[17px] font-semibold">{f.title}</div>
                <div className="mt-1 text-[14px] opacity-75">{f.detail}</div>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      id: "localise",
      kicker: "02 · Localisation & distribution",
      tone: "paper",
      live: { href: "/creator", label: "Creator studio" },
      body: (
        <div>
          <H>One kit. <span className="font-serif font-normal italic text-vermilion">Many local creators.</span></H>
          <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-2">The owner publishes artwork and rules once. Creators design for their own city, language and channels. The server refuses anything that breaks a rule; a named person approves one exact, fingerprinted version.</p>
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
            <Big value={p.reuse.campaignsPerKit} label={`campaigns from one kit, by ${p.reuse.creators} creators`} />
            <Big value={p.operate.medianDecisionHours === null ? "—" : fmtHours(p.operate.medianDecisionHours)} label="median from submission to decision" />
            <Big value={p.operate.medianRounds ?? "—"} label="median review rounds to approval" />
            <Big value={p.operate.blockedByRules.length} label="proposals stopped by rules before a person saw them" />
          </div>
        </div>
      ),
    },
    {
      id: "monetise",
      kicker: "03 · Monetisation & merch",
      tone: "red",
      live: { href: "/campaigns", label: "Campaigns" },
      body: (
        <div>
          <H>Fans pay first. <span className="font-serif font-normal italic">Nothing is made on a guess.</span></H>
          <p className="mt-6 max-w-2xl text-[18px] leading-relaxed opacity-85">Each run has a production gate. Reach it and it’s made; miss it and everyone is refunded in full. Earnings are recorded on delivery and every statement reconciles.</p>
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
            <Big value={formatINR(p.money.totals.licensor).replace(".00", "")} label="royalties to the licensor (test mode)" />
            <Big value={formatINR(p.money.totals.creator).replace(".00", "")} label="earned by Indian creators" />
            <Big value={pct(p.demand.hitRate)} label="of closed campaigns reached their gate" />
            <Big value={p.integrity.chargedTwice} label="orders charged twice, checked against the ledger" />
          </div>
        </div>
      ),
    },
    {
      id: "retain",
      kicker: "04 · Community retention",
      tone: "ink",
      live: { href: "/verify", label: "Verify a tag" },
      body: (
        <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <H>From a viral moment <span className="font-serif font-normal italic text-vermilion">to a stamp book.</span></H>
            <p className="mt-6 max-w-2xl text-[18px] leading-relaxed opacity-70">Every run backed is a stamp in the fan’s passport. Backers follow creators and get a day’s head start on the next drop. Every unit ships with a numbered tag anyone can scan.</p>
            <div className="mt-10 grid grid-cols-3 gap-6">
              <Big value={pct(p.retain.repeatRate)} label="of backers backed a second run" />
              <Big value={p.authentic.tagged} label="items shipped with their own tag" />
              <Big value={p.authentic.scans} label="tag checks so far" />
            </div>
          </div>
          <Hanko lines={["本物", "GENUINE"]} className="mx-auto h-48 w-48" />
        </div>
      ),
    },
    {
      id: "proof",
      kicker: "Measured, not claimed",
      tone: "paper",
      live: { href: "/proof", label: "Proof dashboard" },
      body: (
        <div>
          <H>
            {claims.filter(Boolean).length} of {claims.length} claims <span className="font-serif font-normal italic text-vermilion">meet their target.</span>
          </H>
          <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-2">Every number in this deck is computed live from the app’s own records — reviews, orders, ledger, pulse answers and tag checks. Demo data, real measurement.</p>
          <ul className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-9">
            {claims.map((ok, k) => (
              <li key={k} className={`grid aspect-square place-items-center rounded-full text-[18px] font-semibold ${ok ? "bg-vermilion text-white" : "bg-sand text-ink"}`} aria-label={`Claim ${k + 1}: ${ok ? "met" : "not yet"}`}>
                {ok ? "✓" : k + 1}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: "ask",
      kicker: "The ask",
      tone: "indigo",
      body: (
        <div>
          <H>A 90-day pilot. <span className="font-serif font-normal italic text-sakura">One studio, three creators.</span></H>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              ["Week 1", "Run the fan pulse for one Japanese property. Pick three creators — one in the Northeast, where fans are waiting and nobody sells yet."],
              ["Weeks 2–8", "Three campaigns from one kit, test-mode then live payments. The licensor approves from Tokyo in under 48 hours."],
              ["Weeks 9–12", "Delivery, tags, statements. The proof page reports the same nine claims from real partners."],
            ].map(([t, d]) => (
              <div key={t} className="border-t border-paper/30 pt-4">
                <div className="font-mono text-[14px] text-sakura">{t}</div>
                <p className="mt-2 text-[16px] leading-relaxed opacity-85">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-12 font-serif text-[28px] italic opacity-80">Arigatō — thank you.</p>
        </div>
      ),
    },
  ];

  return <Deck slides={slides} />;
}
