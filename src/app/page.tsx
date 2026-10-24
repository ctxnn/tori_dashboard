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

const DOORS: { userId: string; stage: number; does: string; sun: string }[] = [
  { userId: "usr_haruka", stage: 1, does: "Publish the kit, review proposals against it, approve one exact version.", sun: "#e2402a" },
  { userId: "usr_riya", stage: 2, does: "Design inside the kit, bring the audience, set the price, publish.", sun: "#2f8a62" },
  { userId: "usr_aarav", stage: 4, does: "Back a run before it’s made. Pay in test mode, track the order.", sun: "#d4a13a" },
  { userId: "usr_meera", stage: 5, does: "Release production, ship, refund, and reconcile every rupee.", sun: "#4a86c5" },
];

export default async function Home() {
  const user = await currentUser();
  const published = listLiveCampaigns().map(summarise);
  const featured = published.find((s) => s.campaign.sales_status === "live" && !campaignProgress(s.campaign).deadlinePassed) ?? published[0];
  const fp = featured && campaignProgress(featured.campaign);
  const story = storyData();

  const doors: Door[] = DOORS.flatMap((d) => {
    const u = getUser(d.userId);
    return u ? [{ ...d, name: u.name, role: ROLE_LABEL[u.role], org: `${u.title}, ${u.org}` }] : [];
  });
  const others = ["usr_daichi", "usr_kabir"].flatMap((id) => {
    const u = getUser(id);
    return u ? [{ userId: u.id, name: u.name, role: `${ROLE_LABEL[u.role]} · ${u.title}` }] : [];
  });

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
