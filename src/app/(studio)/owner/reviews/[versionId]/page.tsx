import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { comparisonBase, diffContent, evaluate, getCampaign, getVersion, hashContent } from "@/lib/domain/campaigns";
import { getKit, getKitVersion, listAssets, listKitVersions } from "@/lib/domain/kits";
import { getUser } from "@/lib/domain/core";
import { reviewsForCampaign } from "@/lib/domain/reviews";
import { CHANNELS, TERRITORIES, TERRITORIES_JA, layoutName, productName, productNameJa } from "@/lib/catalog";
import { getT } from "@/lib/i18n";
import { yen } from "@/lib/i18n-shared";
import { REVIEW_STATUS, formatDate, formatDateTime } from "@/lib/labels";
import { allocate, bpsToPercent, formatINR } from "@/lib/money";
import { Badge, Card, CardHeader, KeyValue, Notice, ProofFrame, Seal, StageRail } from "@/components/ui";
import { Preview } from "@/components/preview";
import { CheckList, CheckSummary } from "@/components/check-list";
import { VersionDiff } from "@/components/version-diff";
import { DecisionPanel } from "./decision-panel";

export const metadata = { title: "Review proposal" };

export default async function ReviewPage({ params }: { params: Promise<{ versionId: string }> }) {
  const user = await requirePageRole("owner");
  const tr = await getT("owner");
  const { versionId } = await params;
  const v = getVersion(versionId);
  if (!v) notFound();
  const c = getCampaign(v.campaignId)!;
  const kit = getKit(c.kit_id)!;
  if (kit.owner_org !== user.org) notFound();
  const kv = getKitVersion(v.kitVersionId)!;
  const creator = getUser(c.creator_id)!;
  const approver = getUser(kv.rules.requiredApproverId)!;
  const base = comparisonBase(v);
  const changes = base ? diffContent(base.content, base.kitVersionId, v.content, v.kitVersionId) : [];
  // Re-run the checks now, on the server, rather than trusting what was stored at submission.
  const checks = evaluate(v.content, kv, { approved: v.reviewStatus === "approved", forSubmission: v.reviewStatus === "submitted" });
  const integrityOk = hashContent(v.content, v.kitVersionId) === v.contentHash;
  const reviews = reviewsForCampaign(c.id).filter((r) => r.campaign_version_id === v.id);
  const assets = Object.fromEntries(listAssets(kit.id).map((a) => [a.id, `${a.code} · ${a.name}`]));
  const kitVersions = Object.fromEntries(listKitVersions(kit.id).map((k) => [k.id, tr(`Kit v${k.versionNo}`, `キット第${k.versionNo}版`)]));
  const o = v.content.offer;
  const t = v.content.terms;
  const atThreshold = allocate(o.priceMinor * o.thresholdUnits, t);
  const status = REVIEW_STATUS[v.reviewStatus];
  const live = c.published_version_id && c.published_version_id !== v.id ? getVersion(c.published_version_id) : undefined;
  const compareTo = base;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <Link href="/owner" className="label flex items-center gap-2 text-moss hover:text-ink">
          <span className="h-2 w-2 bg-vermilion" aria-hidden /> {tr("Review queue", "確認待ち一覧")} / {creator.org}
        </Link>
        <StageRail current={3} t={tr} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6 pt-2">
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold leading-[1.02] sm:text-[48px]">{v.content.copy.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={status.tone}>{tr(`Version ${v.versionNo} · ${status.label}`, `バージョン${v.versionNo} · ${status.ja}`)}</Badge>
            <span className="text-moss">{tr(`by ${creator.name}`, `クリエイター：${creator.name}`)}</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 sm:flex">
          {[
            ["submitted", tr("Submitted", "申請日時"), tr.ja ? tr.dateTime(v.submittedAt) : formatDateTime(v.submittedAt)],
            ["kit", tr("Kit", "キット"), `v${kv.versionNo}`],
            ["fingerprint", tr("Fingerprint", "フィンガープリント"), v.contentHash.slice(0, 12)],
          ].map(([key, k, val]) => (
            <div key={key}>
              <dt className="label text-moss">{k}</dt>
              <dd className={`mt-0.5 font-mono text-sm ${key === "fingerprint" && !integrityOk ? "text-fail" : "text-ink"}`}>{val}</dd>
            </div>
          ))}
        </dl>
      </div>
      {!integrityOk && (
        <Notice tone="fail" title={tr("Fingerprint mismatch", "フィンガープリントの不一致")}>
          {tr("Stored content doesn’t match its fingerprint. This version can’t be approved.", "保存された内容がフィンガープリントと一致しません。このバージョンは承認できません。")}
        </Notice>
      )}

      {v.reviewStatus === "superseded" && (
        <Notice tone="warn" title={tr("This version was replaced", "このバージョンは差し替えられました")}>
          {tr("The creator submitted a newer version. Decisions can only be made on the latest submission.", "クリエイターが新しいバージョンを申請しました。ご判断は最新の申請に対してのみ行えます。")}
        </Notice>
      )}
      {live && (
        <Notice tone="info" title={tr(`Fans are currently buying version ${live.versionNo}`, `現在ファンの方はバージョン${live.versionNo}をご購入いただいています`)}>
          {tr(
            `Approving this version doesn’t change the live page until the creator publishes it. Existing orders keep v${live.versionNo}.`,
            `このバージョンを承認しても、クリエイターが公開するまで販売ページは変わりません。既存のご注文はv${live.versionNo}のままです。`,
          )}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {/* Creative */}
          <Card>
            <CardHeader
              eyebrow={tr("Exact creative", "承認対象のデザイン")}
              title={compareTo ? `v${compareTo.versionNo} → v${v.versionNo}` : tr(`Version ${v.versionNo}`, `バージョン${v.versionNo}`)}
              subtitle={tr("Previews are generated from the saved design data, not uploaded mock-ups.", "プレビューは、アップロードされた画像ではなく、保存されたデザインデータから生成しています。")}
            />
            <div className={`grid gap-6 p-5 sm:p-6 ${compareTo ? "sm:grid-cols-2" : "max-w-md"}`}>
              {compareTo && (
                <ProofFrame label={tr(`Before · v${compareTo.versionNo}`, `変更前 · v${compareTo.versionNo}`)} corner={<Badge tone={REVIEW_STATUS[compareTo.reviewStatus].tone}>{tr(REVIEW_STATUS[compareTo.reviewStatus].label, REVIEW_STATUS[compareTo.reviewStatus].ja)}</Badge>}>
                  <Preview svg={compareTo.previewSvg} className="overflow-hidden rounded-md opacity-80 grayscale-[35%]" />
                </ProofFrame>
              )}
              <ProofFrame label={tr(`Proposed · v${v.versionNo}`, `ご提案 · v${v.versionNo}`)} corner={<span className="font-mono text-[11px] text-moss">{v.contentHash.slice(0, 8)}</span>}>
                <Preview svg={v.previewSvg} className="overflow-hidden rounded-md" />
              </ProofFrame>
            </div>
            <div className="border-t border-sand px-5 py-4 text-sm sm:px-6">
              <KeyValue
                items={[
                  [tr("Product & layout", "商品・レイアウト"), `${tr(productName(v.content.productId), productNameJa(v.content.productId))} · ${layoutName(v.content.productId, v.content.layoutId)}`],
                  [tr("Artwork", "素材"), assets[v.content.design.artworkAssetId] ?? tr("Unknown", "不明")],
                  [tr("Print text", "印刷テキスト"), <span key="t">{v.content.design.text.line1 || "—"}{v.content.design.text.line2 && <span className="block text-moss">{v.content.design.text.line2}</span>}</span>],
                ]}
              />
            </div>
          </Card>

          {/* Changes */}
          <Card>
            <CardHeader
              eyebrow={tr("Changes", "変更点")}
              title={compareTo ? tr(`What changed since v${compareTo.versionNo}`, `v${compareTo.versionNo}からの変更点`) : tr("First submission", "初回の申請")}
              subtitle={
                compareTo
                  ? tr(
                      `Compared with the last ${compareTo.reviewStatus === "approved" ? "approved" : "earlier"} version. Approval never carries over: each version needs its own decision.`,
                      `${compareTo.reviewStatus === "approved" ? "直近の承認済み" : "以前の"}バージョンとの比較です。承認は引き継がれません。バージョンごとにご判断をお願いいたします。`,
                    )
                  : undefined
              }
            />
            <div className="p-5 sm:p-6">
              {compareTo ? (
                <VersionDiff changes={changes} lookups={{ assets, kitVersions, productId: v.content.productId }} beforeLabel={`v${compareTo.versionNo}`} afterLabel={`v${v.versionNo}`} t={tr} />
              ) : (
                <p className="text-sm text-moss">{tr("There’s no earlier version of this campaign.", "このキャンペーンに以前のバージョンはございません。")}</p>
              )}
            </div>
          </Card>

          {/* Offer */}
          <Card>
            <CardHeader eyebrow={tr("Offer", "販売条件")} title={tr("What fans will be asked to pay", "ファンの方のお支払い額")} />
            <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
              <KeyValue
                items={[
                  [tr("Item price", "商品価格"), formatINR(o.priceMinor)],
                  [tr("Shipping", "送料"), formatINR(o.shippingMinor)],
                  [tr("Fan pays (1 unit)", "ファンのお支払い（1点）"), formatINR(o.priceMinor + o.shippingMinor)],
                  [tr("Production threshold", "生産条件"), tr(`${o.thresholdUnits} paid units`, `決済済み${o.thresholdUnits}点`)],
                  [tr("Creator’s estimate", "クリエイターの見込み"), tr(`${o.expectedUnits} units`, `${o.expectedUnits}点`)],
                  [tr("Preorders", "予約期間"), tr.ja ? `${tr.date(o.launchDate)} 〜 ${tr.date(o.deadline)}` : `${formatDate(o.launchDate)} → ${formatDate(o.deadline)}`],
                  [tr("Territory", "販売地域"), tr(TERRITORIES[o.territory] ?? o.territory, TERRITORIES_JA[o.territory] ?? o.territory)],
                  [tr("Sizes", "サイズ"), o.sizes.join(", ")],
                ]}
              />
              <div>
                <div className="mb-2 text-sm font-medium">{tr(`At threshold (${o.thresholdUnits} delivered units)`, `生産条件を達成した場合（${o.thresholdUnits}点お届け時）`)}</div>
                <KeyValue
                  items={[
                    [tr("Net item sales", "商品売上（純額）"), formatINR(atThreshold.netItemSales)],
                    [
                      tr(`Your royalty (${bpsToPercent(t.royaltyBps)})`, `貴社のロイヤリティ（${bpsToPercent(t.royaltyBps)}）`),
                      tr.ja ? `${formatINR(atThreshold.licensorRoyalty)}（約${yen(atThreshold.licensorRoyalty)}）` : formatINR(atThreshold.licensorRoyalty),
                    ],
                    [tr(`Creator (${bpsToPercent(t.creatorBps)})`, `クリエイター（${bpsToPercent(t.creatorBps)}）`), formatINR(atThreshold.creatorEarnings)],
                    [tr(`Torii (${bpsToPercent(t.platformBps)})`, `Torii（${bpsToPercent(t.platformBps)}）`), formatINR(atThreshold.toriiCommission)],
                    [tr("Seller share", "販売者の取り分"), formatINR(atThreshold.sellerShare)],
                  ]}
                />
                <p className="mt-2 text-xs text-moss">{tr("Illustrative terms. Earnings are recorded only when units are delivered.", "条件は例示です。収益は、商品をお届けした時点でのみ計上されます。円換算額は参考値（₹1＝¥1.8）です。")}</p>
              </div>
            </div>
          </Card>

          {/* Creator contribution */}
          <Card>
            <CardHeader eyebrow={tr("Creator’s contribution", "クリエイターの取り組み")} title={tr("Audience, local angle and distribution", "想定読者・地域ならではの切り口・販売チャネル")} />
            <div className="space-y-5 p-5 text-sm leading-relaxed sm:p-6">
              {v.content.copy.tagline && <p className="font-display text-lg italic text-ink">“{v.content.copy.tagline}”</p>}
              <div><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">{tr("Story", "紹介文")}</div><p className="text-ink-2">{v.content.copy.story || "—"}</p></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">{tr("Audience", "想定読者")}</div><p className="text-ink-2">{v.content.copy.audience || "—"}</p></div>
                <div><div className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">{tr("Local angle", "地域ならではの切り口")}</div><p className="text-ink-2">{v.content.copy.localAngle || "—"}</p></div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-moss">{tr("Distribution", "販売チャネル")}</div>
                <ul className="flex flex-wrap gap-2">
                  {v.content.distribution.channels.map((ch) => (
                    <li key={ch.id}><Badge>{CHANNELS.find((x) => x.id === ch.id)?.label ?? ch.id} · {ch.plannedReach.toLocaleString("en-IN")}</Badge></li>
                  ))}
                </ul>
                {v.content.distribution.launchMoment && <p className="mt-2 text-ink-2"><span className="text-moss">{tr("Launch moment:", "発売のタイミング：")}</span> {v.content.distribution.launchMoment}</p>}
                {v.content.distribution.creatorCommitment && <p className="text-ink-2"><span className="text-moss">{tr("Commitment:", "取り組み：")}</span> {v.content.distribution.creatorCommitment}</p>}
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">{tr("Rule checks", "ルールチェック")}</h2>
              <span className="text-xs text-moss">{tr("Re-run just now", "ただいま再確認しました")}</span>
            </div>
            <CheckSummary checks={checks} t={tr} />
            <div className="mt-3"><CheckList checks={checks} t={tr} /></div>
            <p className="mt-4 border-t border-sand pt-3 text-xs leading-relaxed text-moss">
              {tr(
                `Automated checks enforce the rules declared in kit v${kv.versionNo}. They don’t establish copyright ownership or replace your creative and commercial judgement.`,
                `自動チェックは、キット第${kv.versionNo}版で定められたルールへの適合を確認するものです。著作権の帰属を証明したり、貴社のクリエイティブ面・事業面でのご判断に代わったりするものではございません。`,
              )}
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="text-base font-semibold">{tr("Your decision", "貴社のご判断")}</h2>
            {reviews.length > 0 && (
              <ul className="mt-3 space-y-2">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-lg bg-ivory px-3 py-2 text-sm">
                    <span className="font-medium">{r.reviewer_name}</span>{" "}
                    {tr(r.decision.replace("_", " "), ({ approved: "承認", changes_requested: "修正依頼", rejected: "見送り" } as Record<string, string>)[r.decision] ?? r.decision)} ·{" "}
                    {tr.ja ? tr.dateTime(r.created_at) : formatDateTime(r.created_at)}
                    {r.comment && <span className="block italic text-ink-2">“{r.comment}”</span>}
                  </li>
                ))}
              </ul>
            )}
            {v.reviewStatus === "submitted" ? (
              <DecisionPanel
                versionId={v.id}
                versionNo={v.versionNo}
                contentHash={v.contentHash}
                canApprove={user.id === approver.id}
                approverName={`${approver.name} (${approver.title})`}
                hasFailures={checks.some((x) => x.status === "fail")}
              />
            ) : (
              <div className="mt-4 flex items-center gap-4">
                {v.reviewStatus === "approved" && <Seal sub={`v${v.versionNo} · ${v.contentHash.slice(0, 6)}`} className="h-24 w-24 shrink-0" />}
                <p className="text-sm text-moss">{tr(`This version is ${status.label.toLowerCase()}; no further decision is needed.`, `このバージョンは「${status.ja}」です。追加のご判断は不要です。`)}</p>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
