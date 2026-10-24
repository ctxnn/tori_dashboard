import Link from "next/link";
import { buildProof, TARGETS } from "@/lib/domain/proof";
import { formatINR } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/labels";
import { Arrow, Badge, Card, CardHeader, Notice, PageHeader, StageIcon, cx } from "@/components/ui";
import { DecisionBars, FunnelBars, GateChart } from "@/components/proof/charts";
import { fmtHours } from "@/lib/format";

export const metadata = {
  title: "Proof",
  description: "Live evidence for Torii's hypothesis, computed from the demo's recorded events.",
};

type Verdict = "meets" | "not-yet" | "no-data";

const VERDICT: Record<Verdict, { label: string; tone: "ok" | "warn" | "neutral"; icon: string }> = {
  meets: { label: "Meets target", tone: "ok", icon: "✓" },
  "not-yet": { label: "Not yet", tone: "warn", icon: "!" },
  "no-data": { label: "No data yet", tone: "neutral", icon: "–" },
};

function TableView({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-[12.5px] font-medium text-moss hover:text-ink">View as table</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[12.5px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-sand text-moss">
            <tr>{head.map((h) => <th key={h} className="py-1.5 pr-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className="py-1.5 pr-3 tabular-nums">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Section({ n, stage, title, claim, children }: { n: string; stage: number; title: string; claim: string; children: React.ReactNode }) {
  return (
    <section className="pt-20" aria-labelledby={`sec-${n}`}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
        <div className="flex items-center gap-4">
          <StageIcon n={stage} className="h-12 w-12 text-vermilion" strokeWidth={1.4} />
          <div>
            <div className="label text-moss">Claim {n}</div>
            <h2 id={`sec-${n}`} className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.035em] sm:text-[36px]">{title}</h2>
          </div>
        </div>
        <p className="max-w-sm text-[14px] leading-relaxed text-ink-2">{claim}</p>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Figure({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: "ok" | "fail" }) {
  return (
    <div className="border-t border-sand pt-4">
      <div className="label text-[10.5px] text-moss">{label}</div>
      <div className={cx("mt-2 text-[40px] font-semibold leading-none tracking-[-0.045em] tabular-nums", tone === "ok" ? "text-ok" : tone === "fail" ? "text-fail" : "text-ink")}>{value}</div>
      {note && <div className="mt-2 text-[12.5px] leading-snug text-moss">{note}</div>}
    </div>
  );
}

export default function ProofPage() {
  const p = buildProof();
  const o = p.operate;
  const i = p.integrity;
  const integrityOk = i.chargedTwice === 0 && i.refundedTwice === 0 && i.ordersOnUnapprovedVersions === 0 && p.money.allReconciled;

  const scorecard: { claim: string; target: string; measured: string; verdict: Verdict }[] = [
    {
      claim: "Owners decide quickly",
      target: `Median ≤ ${TARGETS.decisionHours} h from submission to decision`,
      measured: o.medianDecisionHours === null ? "—" : `${fmtHours(o.medianDecisionHours)} median over ${o.decisions.length} decisions`,
      verdict: o.medianDecisionHours === null ? "no-data" : o.medianDecisionHours <= TARGETS.decisionHours ? "meets" : "not-yet",
    },
    {
      claim: "Few rounds of back-and-forth",
      target: `Median ≤ ${TARGETS.roundsToApproval} review rounds to approval`,
      measured: o.medianRounds === null ? "—" : `${o.medianRounds} round${o.medianRounds === 1 ? "" : "s"} median · ${o.rounds.length} campaigns approved`,
      verdict: o.medianRounds === null ? "no-data" : o.medianRounds <= TARGETS.roundsToApproval ? "meets" : "not-yet",
    },
    {
      claim: "Rules filter before people do",
      target: "No proposal reaches a reviewer while breaking a declared rule",
      measured: `${o.reviewedWithFailingRules} reached a reviewer · ${o.blockedByRules.length} stopped automatically`,
      verdict: o.reviewedWithFailingRules === 0 ? "meets" : "not-yet",
    },
    {
      claim: "One kit, many collaborations",
      target: `≥ ${TARGETS.campaignsPerKit} campaigns per kit`,
      measured: `${p.reuse.campaignsPerKit.toFixed(p.reuse.campaignsPerKit % 1 ? 1 : 0)} campaigns per kit · ${p.reuse.creators} creators`,
      verdict: p.reuse.kits === 0 ? "no-data" : p.reuse.campaignsPerKit >= TARGETS.campaignsPerKit ? "meets" : "not-yet",
    },
    {
      claim: "Demand is tested before anything is made",
      target: `≥ ${Math.round(TARGETS.gateHitRate * 100)}% of closed campaigns reach their gate; misses are refunded`,
      measured: p.demand.hitRate === null ? "No campaign has closed yet" : `${Math.round(p.demand.hitRate * 100)}% of ${p.demand.closedCount} closed campaigns`,
      verdict: p.demand.hitRate === null ? "no-data" : p.demand.hitRate >= TARGETS.gateHitRate ? "meets" : "not-yet",
    },
    {
      claim: "The money can be trusted",
      target: "Zero double charges, double refunds or sales of unapproved versions; statements reconcile",
      measured: integrityOk ? `0 · 0 · 0 · ${p.money.statements.length} statements reconcile` : "An integrity check failed — see below",
      verdict: integrityOk ? "meets" : "not-yet",
    },
  ];
  const met = scorecard.filter((s) => s.verdict === "meets").length;

  return (
    <div>
      <PageHeader
        eyebrow="Evidence · computed from recorded events"
        stage={5}
        title={<>Is it actually easier? <span className="font-serif font-normal italic">Measured.</span></>}
        description="Our hypothesis is that reusable kits, exact approvals and honest reporting make small creator collaborations easier to operate. Below, each part of that claim gets a target and a live measurement from this app’s own records."
        meta={[
          ["Claims met", `${met} / ${scorecard.length}`],
          ["Updated", formatDateTime(p.generatedAt)],
        ]}
      />

      <Notice tone="gold" title="Demonstration data, real measurement">
        These numbers come from the seeded demo plus anything people have done in it since. They show what Torii can prove about a collaboration, not market results. The targets are our pilot hypothesis, not industry benchmarks. Run a pilot with real partners and this page fills with real evidence.
      </Notice>

      {/* Scorecard */}
      <section aria-labelledby="scorecard" className="pt-12">
        <h2 id="scorecard" className="sr-only">Scorecard</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-ink text-moss">
                <th className="label py-3 pr-4 text-[10.5px] font-medium">Claim</th>
                <th className="label py-3 pr-4 text-[10.5px] font-medium">Pilot target</th>
                <th className="label py-3 pr-4 text-[10.5px] font-medium">Measured now</th>
                <th className="label py-3 text-right text-[10.5px] font-medium">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {scorecard.map((s, idx) => {
                const v = VERDICT[s.verdict];
                return (
                  <tr key={s.claim} className="align-top">
                    <td className="py-4 pr-4">
                      <span className="mr-3 font-mono text-[12px] text-vermilion">0{idx + 1}</span>
                      <span className="text-[16px] font-semibold tracking-[-0.02em]">{s.claim}</span>
                    </td>
                    <td className="py-4 pr-4 text-[13.5px] text-ink-2">{s.target}</td>
                    <td className="py-4 pr-4 font-mono text-[13px] text-ink">{s.measured}</td>
                    <td className="py-4 text-right">
                      <Badge tone={v.tone}>
                        <span aria-hidden>{v.icon}</span> {v.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 01–03 Operate */}
      <Section n="01–03" stage={3} title="Easier to operate" claim="Fast decisions, few rounds, and the obvious problems caught by the server before anyone spends time on them.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Time from submission to decision" subtitle="Each bar is one review decision on one exact version." />
            <div className="px-5 pb-5 sm:px-6">
              <DecisionBars rows={o.decisions} target={TARGETS.decisionHours} />
              <TableView
                caption="Decisions"
                head={["Campaign", "Version", "Decision", "Reviewer", "Time"]}
                rows={o.decisions.map((d) => [d.title, `v${d.versionNo}`, d.decision.replace("_", " "), d.reviewer, fmtHours(d.hours)])}
              />
            </div>
          </Card>
          <div className="grid content-start gap-6">
            <div className="grid grid-cols-2 gap-6">
              <Figure label="Median decision" value={o.medianDecisionHours === null ? "—" : fmtHours(o.medianDecisionHours)} note={`Target ≤ ${TARGETS.decisionHours} h`} />
              <Figure label="Median rounds" value={o.medianRounds ?? "—"} note={`to approval · target ≤ ${TARGETS.roundsToApproval}`} />
              <Figure label="Stopped by rules" value={o.blockedByRules.length} note="submissions refused before a person saw them" />
              <Figure label="Broken rules reviewed" value={o.reviewedWithFailingRules} tone={o.reviewedWithFailingRules === 0 ? "ok" : "fail"} note="proposals that reached a reviewer while failing a rule" />
            </div>
            <Card className="p-5">
              <div className="label text-[10.5px] text-moss">Waiting for a decision now</div>
              {o.pending.length === 0 ? (
                <p className="mt-2 text-sm text-moss">Nothing in the queue.</p>
              ) : (
                <ul className="mt-2 divide-y divide-sand text-sm">
                  {o.pending.map((q, k) => (
                    <li key={k} className="flex justify-between gap-3 py-2">
                      <span>{q.title} <span className="font-mono text-moss">v{q.versionNo}</span></span>
                      <span className={cx("font-mono text-[12px]", q.hours > TARGETS.decisionHours ? "text-fail" : "text-ink-2")}>waiting {fmtHours(q.hours)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {o.blockedByRules.length > 0 && (
                <>
                  <div className="label mt-5 text-[10.5px] text-moss">Stopped automatically</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {o.blockedByRules.slice(0, 4).map((b, k) => (
                      <li key={k} className="flex justify-between gap-3">
                        <span>{b.title}</span>
                        <span className="font-mono text-[12px] text-fail">{b.reason}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
        </div>
      </Section>

      {/* 04 Reuse */}
      <Section n="04" stage={1} title="One kit, many collaborations" claim="The owner prepares artwork and rules once; every creator after that starts from the same approved kit.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Proposals built on each kit version" subtitle="Rules can change; each proposal stays tied to the version it was made under." />
            <ul className="divide-y divide-sand px-5 pb-4 sm:px-6">
              {p.reuse.kitVersions.map((k) => (
                <li key={k.versionNo} className="flex items-center justify-between gap-4 py-3">
                  <span className="font-medium">Sky Courier kit v{k.versionNo}</span>
                  <span className="font-mono text-[13px] text-ink-2">
                    {k.campaigns} campaign{k.campaigns === 1 ? "" : "s"} · {k.proposals} proposal version{k.proposals === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="How often each artwork was used" subtitle="Campaigns that used the asset in any version." />
            <div className="px-5 pb-5 sm:px-6">
              <FunnelBars steps={p.reuse.assets.map((a) => ({ label: `${a.code} · ${a.name}`, value: a.campaigns }))} />
            </div>
          </Card>
        </div>
      </Section>

      {/* 05 Demand */}
      <Section n="05" stage={4} title="Demand before production" claim="Nothing is made until enough fans have paid. Campaigns that miss their gate are refunded in full.">
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {p.demand.gates.map((g) => {
            const last = g.points[g.points.length - 1]?.units ?? 0;
            return (
              <li key={g.campaignId}>
                <Card className="h-full p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/c/${g.slug}`} className="font-semibold tracking-[-0.02em] hover:underline">{g.title}</Link>
                      <div className="mt-0.5 font-mono text-[11px] text-moss">{formatDate(g.launch)} → {formatDate(g.deadline)}</div>
                    </div>
                    <Badge tone={g.reached ? "ok" : g.closed ? "fail" : "info"}>{g.reached ? `Gate in ${g.daysToGate! + 1} days` : g.closed ? "Missed · refunded" : "Open"}</Badge>
                  </div>
                  <div className="mt-4"><GateChart points={g.points} threshold={g.threshold} durationDays={g.durationDays} title={g.title} reached={g.reached} /></div>
                  <div className="mt-2 font-mono text-[12px] text-ink-2"><span className="text-ink">{last}</span> / {g.threshold} paid units now</div>
                </Card>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="From checkout to delivery" subtitle="Every order across all campaigns." />
            <div className="px-5 pb-5 sm:px-6">
              <FunnelBars
                steps={[
                  { label: "Checkouts started", value: p.demand.funnel.started },
                  { label: "Paid", value: p.demand.funnel.paid },
                  { label: "Delivered", value: p.demand.funnel.delivered, tone: "ok" },
                  { label: "Refunded", value: p.demand.funnel.refunded, tone: "fail", note: "cancelled runs and fan requests" },
                ]}
              />
              <p className="mt-4 text-[12.5px] text-moss">{p.demand.funnel.declinedAttempts} payment attempts were declined in the simulator and could be retried.</p>
            </div>
          </Card>
          <div className="grid grid-cols-2 content-start gap-6">
            <Figure label="Gate hit rate" value={p.demand.hitRate === null ? "—" : `${Math.round(p.demand.hitRate * 100)}%`} note={`of ${p.demand.closedCount} closed campaigns · target ≥ ${Math.round(TARGETS.gateHitRate * 100)}%`} />
            <Figure
              label="Paid → delivered"
              value={p.demand.funnel.paid ? `${Math.round((p.demand.funnel.delivered / p.demand.funnel.paid) * 100)}%` : "—"}
              note="of paid orders have been delivered"
            />
          </div>
        </div>
      </Section>

      {/* 06 Money */}
      <Section n="06" stage={5} title="Money that adds up" claim="Earnings are recorded on delivery and every statement is re-checked against its orders. Payment events can’t count twice.">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Earned per collaboration" subtitle="Recorded on delivered units, from each campaign’s statement." />
            <div className="overflow-x-auto px-5 pb-5 sm:px-6">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <thead className="border-b border-sand text-moss">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Campaign</th>
                    <th className="py-2 pr-3 text-right font-medium">Units</th>
                    <th className="py-2 pr-3 text-right font-medium">Licensor</th>
                    <th className="py-2 pr-3 text-right font-medium">Creator</th>
                    <th className="py-2 pr-3 text-right font-medium">Torii</th>
                    <th className="py-2 text-right font-medium">Reconciles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {p.money.statements.map((s) => (
                    <tr key={s.title}>
                      <td className="py-2.5 pr-3">{s.title}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{s.units}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(s.licensor)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(s.creator)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(s.torii)}</td>
                      <td className="py-2.5 text-right">{s.reconciled ? <Badge tone="ok">✓ Yes</Badge> : <Badge tone="fail">✕ No</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-ink font-semibold">
                  <tr>
                    <td className="py-2.5 pr-3">Total</td>
                    <td />
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(p.money.totals.licensor)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(p.money.totals.creator)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatINR(p.money.totals.torii)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <p className="mt-3 text-[12px] text-moss">Simulated test-mode money. Torii’s share is revenue before its expenses, not profit.</p>
            </div>
          </Card>
          <div className="grid grid-cols-2 content-start gap-6">
            <Figure label="Charged twice" value={i.chargedTwice} tone={i.chargedTwice === 0 ? "ok" : "fail"} note="orders with more than one capture" />
            <Figure label="Refunded twice" value={i.refundedTwice} tone={i.refundedTwice === 0 ? "ok" : "fail"} note="orders with more than one refund" />
            <Figure label="Unapproved sales" value={i.ordersOnUnapprovedVersions} tone={i.ordersOnUnapprovedVersions === 0 ? "ok" : "fail"} note="orders on a version without valid approval" />
            <Figure label="Duplicates ignored" value={i.duplicatesIgnored} note={`repeat payment events · ${i.rejectedSignatures} bad signatures rejected`} />
          </div>
        </div>
      </Section>

      {/* Pilot */}
      <section className="mt-24 grid gap-8 rounded-[var(--radius-card)] bg-ink p-6 text-paper sm:p-10 lg:grid-cols-[1fr_1.2fr]" aria-labelledby="pilot">
        <div>
          <div className="label text-paper/50">What a pilot proves</div>
          <h2 id="pilot" className="mt-3 text-[30px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[40px]">
            Same page, <span className="font-serif font-normal italic text-vermilion">real partners.</span>
          </h2>
        </div>
        <div className="space-y-4 text-[14.5px] leading-relaxed text-paper/75">
          <p>With one Japanese licensor and three Indian creators, this page records the same six claims from real decisions and real (test, then live) payments. No new tooling is needed.</p>
          <p>The one number Torii can’t record itself is the baseline: how long a small collaboration takes the licensor today. We’d ask for it on day one and compare against it.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/#enter" className="group inline-flex h-11 items-center gap-2 rounded-lg bg-vermilion px-5 text-sm font-medium text-white hover:bg-vermilion-2">Generate new evidence <Arrow /></Link>
            <Link href="/how-it-works" className="group inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium text-paper ring-1 ring-inset ring-paper/25 hover:ring-paper">Watch the films <Arrow /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
