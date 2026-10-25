import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { getUser } from "@/lib/domain/core";
import { listLiveCampaigns, summarise } from "@/lib/domain/campaigns";
import { campaignProgress } from "@/lib/domain/orders";
import { landingStats, landingTicker, storyData } from "@/lib/landing";
import { ROLE_LABEL } from "@/lib/labels";
import { formatINR } from "@/lib/money";
import { Arrow } from "@/components/ui";
import { ResetDemo } from "@/components/reset-demo";
import { CampaignTile } from "@/components/campaign-tile";
import { Hero } from "@/components/landing/hero";
import { LiveStats } from "@/components/landing/live-stats";
import { GateStory } from "@/components/landing/gate-story";
import { RoleDoors, type Door } from "@/components/landing/role-doors";
import { BriefChain } from "@/components/landing/brief-chain";
import { buildProof } from "@/lib/domain/proof";
import { launchPhase } from "@/lib/domain/community";
import { FanAppSection } from "@/components/landing/fan-app";
import { uiMode } from "@/lib/ui-mode";
import { V2Home } from "@/components/v2/home";
import type { V2Door } from "@/components/v2/doors";

// What each door shows, for the new look's role cards.
const SEES: Record<string, { sees: string[]; tint: V2Door["tint"] }> = {
  usr_haruka: { sees: ["the asset kit and its rules", "proposals waiting for approval", "royalties from every delivered unit"], tint: "pink" },
  usr_riya: { sees: ["your studio and the kit’s rules", "live rule checks as you design", "backers, gate and payout"], tint: "green" },
  usr_aarav: { sees: ["the fan app: manga, figures, collabs", "your passport and backed runs", "tags you can verify"], tint: "yellow" },
  usr_meera: { sees: ["production gates and releases", "payment events and refunds", "statements that reconcile"], tint: "blue" },
};

const DOORS: { userId: string; stage: number; does: string; sun: string }[] = [
  { userId: "usr_haruka", stage: 1, does: "Publish the kit, review proposals against it, approve one exact version.", sun: "#e2402a" },
  { userId: "usr_riya", stage: 2, does: "Design inside the kit, bring the audience, set the price, publish.", sun: "#2f8a62" },
  { userId: "usr_aarav", stage: 4, does: "Read official manga, back a run before it’s made, scan the tag on what arrives.", sun: "#d4a13a" },
  { userId: "usr_meera", stage: 5, does: "Release production, ship, refund, and reconcile every rupee.", sun: "#4a86c5" },
];

export default async function Home() {
  const user = await currentUser();
  const published = listLiveCampaigns().map(summarise);
  // Feature a run anyone can buy right now (not one still in its backers' day).
  const featured =
    published.find((s) => s.campaign.sales_status === "live" && !campaignProgress(s.campaign).deadlinePassed && launchPhase(s.published!.content.offer.launchDate).phase === "open") ?? published[0];
  const fp = featured && campaignProgress(featured.campaign);
  const story = storyData();
  const proof = buildProof();
  const chain = [
    {
      step: "01 · Audience discovery",
      brief: "Understand Indian fans, by region",
      answer: "The fan pulse",
      body: "Fans say where they are, what they’d buy and what they’d pay — before anything is proposed. The owner sees an India map, a price curve and gaps.",
      figure: proof.discover.signals.toLocaleString("en-IN"),
      figureLabel: `fans in ${proof.discover.cities} cities`,
      href: "/pulse",
      cta: "Answer it",
      pattern: "seigaiha" as const,
    },
    {
      step: "02 · Localisation & distribution",
      brief: "Local content, local partners",
      answer: "Kits for local creators",
      body: "The owner hands over artwork and rules once. Indian creators design for their own audience, language and channels; rules are checked automatically.",
      figure: String(proof.reuse.campaignsPerKit),
      figureLabel: `campaigns from one kit · ${proof.reuse.creators} creators`,
      href: "/how-it-works",
      cta: "See how",
      pattern: "shippo" as const,
    },
    {
      step: "03 · Monetisation & merch",
      brief: "Official merch at Indian prices",
      answer: "Paid preorders, real royalties",
      body: "Fans pay before anything is made; misses are refunded. Every delivered unit pays the licensor, the creator and the seller — reconciled to the paisa.",
      figure: formatINR(proof.money.totals.licensor).replace(".00", ""),
      figureLabel: "royalties to the licensor so far",
      href: "/campaigns",
      cta: "Browse",
      pattern: "seigaiha-red" as const,
    },
    {
      step: "04 · Community retention",
      brief: "From viral moments to loyal fans",
      answer: "Passports, follows, real tags",
      body: "Backers collect stamps, follow creators and get a day’s head start on the next drop. Every item carries a tag anyone can verify.",
      figure: proof.retain.repeatRate === null ? "—" : `${Math.round(proof.retain.repeatRate * 100)}%`,
      figureLabel: `of backers came back · ${proof.authentic.tagged} items tagged`,
      href: "/verify",
      cta: "Verify one",
      pattern: "seigaiha-indigo" as const,
    },
  ];

  const doors: Door[] = DOORS.flatMap((d) => {
    const u = getUser(d.userId);
    return u ? [{ ...d, name: u.name, role: ROLE_LABEL[u.role], org: `${u.title}, ${u.org}` }] : [];
  });
  const others = ["usr_daichi", "usr_kabir"].flatMap((id) => {
    const u = getUser(id);
    return u ? [{ userId: u.id, name: u.name, role: `${ROLE_LABEL[u.role]} · ${u.title}` }] : [];
  });

  if ((await uiMode()) === "new") {
    return (
      <V2Home
        featured={
          featured && fp
            ? {
                title: featured.published!.content.copy.title,
                svg: featured.published!.previewSvg,
                price: formatINR(featured.published!.content.offer.priceMinor),
                versionNo: featured.published!.versionNo,
                hash: featured.published!.contentHash,
                paid: fp.paidUnits,
                threshold: fp.threshold,
                creator: featured.creator.name,
                owner: featured.kit.owner_org,
              }
            : null
        }
        stats={landingStats()}
        ticker={landingTicker()}
        stages={chain}
        royalty={formatINR(proof.money.totals.licensor).replace(".00", "")}
        published={published}
        doors={doors.map((d) => ({ ...d, ...SEES[d.userId] }))}
        others={others}
        currentId={user?.id}
      />
    );
  }

  return (
    <div>
      <Hero
        proof={
          featured && fp
            ? {
                slug: featured.campaign.slug,
                title: featured.published!.content.copy.title,
                svg: featured.published!.previewSvg,
                price: formatINR(featured.published!.content.offer.priceMinor),
                versionNo: featured.published!.versionNo,
                hash: featured.published!.contentHash,
                paid: fp.paidUnits,
                threshold: fp.threshold,
              }
            : null
        }
        ticker={landingTicker()}
      />

      <LiveStats stats={landingStats()} />

      <FanAppSection />

      <BriefChain stages={chain} />

      {story && <GateStory data={story} />}

      <RoleDoors doors={doors} others={others} currentId={user?.id} />

      <section aria-labelledby="wall" className="pt-28">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-6">
          <h2 id="wall" className="text-[38px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[64px]">
            On the <span className="font-serif font-normal italic">wall.</span>
          </h2>
          <Link href="/campaigns" className="group flex items-center gap-2 text-sm font-medium text-ink">
            Every campaign <Arrow />
          </Link>
        </div>
        <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {published.slice(0, 3).map((s, i) => (
            <li key={s.campaign.id}>
              <CampaignTile s={s} index={i} />
            </li>
          ))}
        </ul>
      </section>

      <section data-dark-band className="bleed grain relative mt-32 overflow-hidden bg-ink text-paper" aria-labelledby="closing">
        <div className="seigaiha-ink absolute inset-x-0 bottom-0 h-64 [mask-image:linear-gradient(to_top,black_20%,transparent)]" aria-hidden />
        <div
          className="pointer-events-none absolute -right-[4vw] top-1/2 -translate-y-1/2 select-none font-serif text-[38vw] leading-none text-transparent [-webkit-text-stroke:1px_rgba(245,244,239,0.09)] lg:text-[26vw]"
          aria-hidden
        >
          鳥居
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="label text-paper/50">The hypothesis</div>
          <h2 id="closing" className="mt-6 max-w-4xl text-[40px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[76px]">
            Small enough to start. <span className="font-serif font-normal italic text-vermilion">Strict enough to trust.</span>
          </h2>
          <p className="mt-8 max-w-xl text-[16px] leading-relaxed text-paper/65">
            We think reusable kits, exact approvals and honest reporting make small creator collaborations worth an IP owner’s time. This prototype shows the workflow end to end; a pilot with a real partner is how we find out.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#enter" className="group inline-flex h-12 items-center gap-2 rounded-lg bg-vermilion px-6 text-[15px] font-medium text-white transition-colors hover:bg-vermilion-2">
              Try it as a role <Arrow />
            </a>
            <Link href="/how-it-works" className="group inline-flex h-12 items-center gap-2 rounded-lg px-5 text-[15px] font-medium text-paper ring-1 ring-inset ring-paper/25 transition-colors hover:ring-paper">
              Watch the films <Arrow />
            </Link>
          </div>
        </div>
      </section>

      <section id="reset" aria-labelledby="reset-title" className="scroll-mt-24 pt-14">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div>
            <h2 id="reset-title" className="text-base font-semibold">Reset the demo</h2>
            <p className="mt-1 text-sm text-moss">Restores the seeded kit, campaigns, simulated orders and ledger. Only touches this local database and its uploads folder.</p>
          </div>
          <ResetDemo />
        </div>
      </section>
    </div>
  );
}
