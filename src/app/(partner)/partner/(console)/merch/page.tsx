import Link from "next/link";
import { requirePartner } from "@/store/lib/partner-auth";
import { merchForOwner } from "@/store/lib/collabs";
import { currentUser as studioUser } from "@/lib/auth";
import { Card, PageHead, Stat } from "@/store/components/partner/ui";
import { CollabTile } from "@/store/components/Collabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Merch collabs" };

/**
 * The publisher's merchandise programme. Kits, approvals and statements are run in the Torii
 * workspace; this page shows the same records from the publisher's side.
 */
export default async function Merch() {
  const { org } = await requirePartner("/partner/merch");
  const m = merchForOwner(org.name);
  const studio = await studioUser();
  // The workspace opens straight in for the IP owner chosen at /switch; anyone else picks a person there.
  const workspace = (path: string) => (studio?.role === "owner" ? path : `/switch?need=owner`);

  if (!m.kits.length) {
    return (
      <div className="space-y-6">
        <PageHead en="Merch collabs" ja="グッズ・コラボ" sub="Let Indian artists make official merchandise from your series, with your approval on every design." />
        <Card>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-[19px] font-bold tracking-[-0.02em]">{org.name} has no merch kit yet</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                A kit is your original artwork plus the rules: which products, which regions, the price range, and who at {org.name} must approve. Indian creators design inside it, the server refuses anything that breaks a rule, and fans pay before anything is made.
              </p>
              <ul className="mt-4 space-y-2 text-[14.5px]">
                {["Approve one exact version: any later change needs fresh approval", "Royalty recorded on every delivered unit, on your statement", "Every unit ships with a tag fans can scan to prove it’s real"].map((t) => (
                  <li key={t} className="flex gap-2"><span aria-hidden className="text-accent">✓</span>{t}</li>
                ))}
              </ul>
              <p className="mt-5 text-[14px] text-muted">Torii sets up kits with each publisher during onboarding. See how Kumo Lantern Studio runs Sky Courier:</p>
              <Link href="/how-it-works" className="btn-ghost mt-3">How collaborations work</Link>
            </div>
            <div className="rounded-xl bg-accentsoft/60 p-5 text-[14px] leading-relaxed">
              <div className="font-bold">What the numbers look like</div>
              <p className="mt-1 text-muted">On the demo series, creators have built five collaborations from one kit, and half the campaigns that closed reached their production gate. The rest were refunded in full.</p>
              <Link href="/proof" className="mt-3 inline-block font-semibold text-accent underline underline-offset-2">See the proof dashboard</Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHead en="Merch collabs" ja="グッズ・コラボ" sub={`Official merchandise Indian creators have made from ${org.name}’s kits. You approve every design; fans pay before anything is made.`}>
        <Link href={workspace("/owner/kit")} className="btn-ghost">Edit the kit</Link>
        <Link href={workspace("/owner")} className="btn-primary">Open the workspace{m.awaitingApproval ? ` · ${m.awaitingApproval} to approve` : ""}</Link>
      </PageHead>

      {m.awaitingApproval > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-panel border border-warn/30 bg-warn/10 px-5 py-4 text-[14.5px]">
          <b className="text-warn">{m.awaitingApproval} design{m.awaitingApproval === 1 ? "" : "s"} waiting for your approval</b>
          <span className="text-fg/80">Each one has passed the kit’s rule checks. Approving binds to that exact version.</span>
          <Link href={workspace("/owner")} className="ml-auto font-semibold text-accent underline underline-offset-2">Review now</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Kits published" value={String(m.kits.length)} sub={m.kits.map((k) => k.property).join(", ")} />
        <Stat label="Collaborations" value={String(m.collabs.length)} sub={`${m.collabs.filter((c) => c.open).length} taking preorders now`} />
        <Stat label="Units backed by fans" value={m.unitsBacked.toLocaleString("en-IN")} sub="paid before production" />
        <Stat strong label="Royalty earned" value={m.royalty} sub="recognised on delivery" />
      </div>

      <Card title="Collaborations" ja="コラボ一覧" action={<Link href="/collabs" className="text-[13.5px] font-semibold text-accent">As fans see them</Link>}>
        {m.collabs.length ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
            {m.collabs.map((c) => <li key={c.slug}><CollabTile c={c} /></li>)}
          </ul>
        ) : <p className="text-[14px] text-muted">No published collaborations yet. Approved designs appear here once the creator publishes them.</p>}
      </Card>
    </div>
  );
}
