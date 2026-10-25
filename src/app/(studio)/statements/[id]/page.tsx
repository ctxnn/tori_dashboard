import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { canViewCampaign, getCampaign } from "@/lib/domain/campaigns";
import { buildStatement, BUCKETS } from "@/lib/domain/statements";
import { SELLER } from "@/lib/domain/core";
import { ORDER_STATUS, SALES_STATUS, formatDate, formatDateTime } from "@/lib/labels";
import { bpsToPercent, formatINR } from "@/lib/money";
import { productName, productNameJa } from "@/lib/catalog";
import { getT } from "@/lib/i18n";
import { makeT, yen, type T } from "@/lib/i18n-shared";
import { Badge, Card, CardHeader, Notice, StageRail, buttonClass, cx } from "@/components/ui";
import { AllocationBar } from "@/components/allocation-bar";
import { PrintButton } from "./print-button";

export const metadata = { title: "Commercial statement" };

function Row({ label, value, sub, href, strong, negative, t = makeT("en"), withYen }: { label: React.ReactNode; value: number; sub?: React.ReactNode; href?: string; strong?: boolean; negative?: boolean; t?: T; withYen?: boolean }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-2.5", strong && "border-t border-ink/20 pt-3")}>
      <div className="min-w-0">
        <div className={cx("text-sm", strong ? "font-semibold text-ink" : "text-ink-2")}>{label}</div>
        {sub && <div className="text-xs text-moss">{sub}</div>}
      </div>
      <div className="flex shrink-0 items-baseline gap-3">
        {href && <Link href={href} className="text-xs font-medium text-pine hover:underline print:hidden">{t("orders →", "注文 →")}</Link>}
        <span className={cx("tabular-nums", strong ? "font-display text-lg font-semibold" : "text-sm font-medium", negative && "text-fail")}>
          {formatINR(value)}
          {withYen && t.ja && <span className="ml-1.5 text-xs font-normal text-moss">約{yen(value)}</span>}
        </span>
      </div>
    </div>
  );
}

export default async function StatementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ bucket?: string }> }) {
  const user = await requirePageRole("owner", "creator", "operator");
  const t = await getT("owner");
  const { id } = await params;
  const { bucket } = await searchParams;
  const c = getCampaign(id);
  if (!c || !canViewCampaign(user, c)) notFound();
  const s = buildStatement(c.id);
  const r = s.recognised;
  const terms = s.byVersion[s.byVersion.length - 1]?.terms;
  const sales = SALES_STATUS[c.sales_status];
  const allOk = s.checks.every((x) => x.ok);
  const link = (b: string) => `/statements/${c.id}?bucket=${b}#orders`;
  const shownOrders = bucket ? s.orders.filter((o) => (bucket === "captured" ? o.paid_at : o.status === bucket)) : s.orders;
  const a = s.assumptions;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3">
        <div className="label flex items-center gap-2 text-moss">
          <span className="h-2 w-2 bg-vermilion" aria-hidden /> {t("Commercial statement", "収支明細")} · {s.kit.property_name} × {s.creator.name}
        </div>
        <StageRail current={5} t={t} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-6 pt-2">
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold leading-[1.02] sm:text-[48px]">{s.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-moss">
            <Badge tone={sales.tone}>{t(sales.label, sales.ja)}</Badge>
            <span className="font-mono text-[12px]">{t(`seller ${SELLER.name} · generated ${formatDateTime(s.generatedAt)}`, `販売者 ${SELLER.name} · 作成 ${t.dateTime(s.generatedAt)}`)}</span>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <a href={`/api/statements/${c.id}/csv`} className={buttonClass("secondary", "sm")}>{t("Export CSV", "CSVを書き出す")}</a>
          <PrintButton />
        </div>
      </div>

      {s.dataMode !== "live" && (
        <Notice tone="gold" title={t("Simulated test data — not live commercial results", "テスト用の模擬データです（実際の販売実績ではございません）")}>
          {t("Every payment and refund here came from Torii’s payment simulator. The structure is real; the money isn’t.", "こちらの決済・返金はすべて、Toriiの決済シミュレーターによるものです。仕組みは本番と同じですが、実際の金銭は動いておりません。")}
        </Notice>
      )}

      <section className="rounded-[var(--radius-card)] border border-sand bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label text-moss">{t(`Recorded · net item sales on ${r.units} delivered units`, `計上済み · お届け済み${r.units}点の商品純売上`)}</div>
            <div className="mt-2 text-[44px] font-semibold leading-none tracking-[-0.045em] tabular-nums sm:text-[56px]">{formatINR(r.itemSales)}</div>
          </div>
          <div className="text-right font-mono text-xs leading-relaxed text-moss">
            {t(`net collected ${formatINR(s.cash.netMinor)}`, `入金純額 ${formatINR(s.cash.netMinor)}`)}
            <br />
            {t(`${s.cash.refundedCount} refund${s.cash.refundedCount === 1 ? "" : "s"} · ${formatINR(s.cash.refundedMinor)}`, `返金${s.cash.refundedCount}件 · ${formatINR(s.cash.refundedMinor)}`)}
          </div>
        </div>
        <div className="mt-6">
          <AllocationBar
            total={r.itemSales}
            t={t}
            slices={[
              { label: `${t("Licensor", "ライセンサー")} ${terms ? bpsToPercent(terms.royaltyBps) : ""}`, sub: t.ja ? `${s.kit.owner_org} · 約${yen(r.licensorRoyalty)}` : s.kit.owner_org, value: r.licensorRoyalty, className: "bg-vermilion text-white" },
              { label: `${t("Creator", "クリエイター")} ${terms ? bpsToPercent(terms.creatorBps) : ""}`, sub: s.creator.name, value: r.creatorEarnings, className: "bg-pine text-paper" },
              { label: `Torii ${terms ? bpsToPercent(terms.platformBps) : ""}`, sub: t("Revenue before expenses, not profit", "経費控除前の売上（利益ではございません）"), value: r.toriiCommission, className: "bg-ink text-paper" },
              { label: t("Seller share", "販売者の取り分"), sub: t(`${SELLER.name} · production & fulfilment`, `${SELLER.name} · 生産・発送`), value: r.sellerShare, className: "bg-sand-2 text-ink" },
            ]}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow={t("Recorded · from the ledger", "計上済み · 台帳より")} title={t("Money in and out", "入出金")} subtitle={t("Actual payment and refund events.", "実際の決済・返金の記録です。")} />
          <div className="divide-y divide-sand px-5 sm:px-6">
            <Row t={t} label={t(`Payments captured (${s.cash.capturedCount})`, `決済（${s.cash.capturedCount}件）`)} value={s.cash.capturedMinor} href={link("captured")} />
            <Row t={t} label={t(`Refunds paid (${s.cash.refundedCount})`, `返金（${s.cash.refundedCount}件）`)} value={-s.cash.refundedMinor} negative href={link("refunded")} />
            <Row t={t} label={t("Net collected", "入金純額")} value={s.cash.netMinor} strong sub={t("Held for paid, in-production, shipped and delivered orders.", "支払い済み・生産中・発送済み・お届け済みの注文分として保持しています。")} />
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow={t("Recorded · earned on delivery", "計上済み · お届け時に計上")} title={t(`${r.units} delivered units`, `お届け済み ${r.units}点`)} subtitle={t("Allocations are posted to the ledger when each order is delivered.", "配分は、各注文のお届け時に台帳へ記帳されます。")} />
          <div className="divide-y divide-sand px-5 sm:px-6">
            <Row t={t} label={t("Net item sales", "商品の純売上")} value={r.itemSales} sub={t(`${r.orders} delivered orders`, `お届け済みの注文 ${r.orders}件`)} href={link("delivered")} strong />
            <Row t={t} withYen label={`${t("Licensor royalty", "ライセンサーへのロイヤリティ")}${terms ? ` · ${bpsToPercent(terms.royaltyBps)}` : ""}`} value={r.licensorRoyalty} sub={s.kit.owner_org} />
            <Row t={t} label={`${t("Creator earnings", "クリエイター報酬")}${terms ? ` · ${bpsToPercent(terms.creatorBps)}` : ""}`} value={r.creatorEarnings} sub={s.creator.name} />
            <Row t={t} label={`${t("Torii commission", "Torii手数料")}${terms ? ` · ${bpsToPercent(terms.platformBps)}` : ""}`} value={r.toriiCommission} sub={t("Revenue before Torii’s expenses — not profit.", "Toriiの経費控除前の売上です（利益ではございません）。")} />
            <Row t={t} label={t("Seller share", "販売者の取り分")} value={r.sellerShare} sub={t(`${SELLER.name} · covers production and fulfilment`, `${SELLER.name} · 生産・発送の費用に充当`)} />
            <Row t={t} label={t("Shipping charged", "送料")} value={r.shipping} sub={t("Passed to the seller for courier costs.", "配送費用として販売者へお渡しします。")} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          eyebrow={t("Reconciliation", "照合")}
          title={allOk ? t("Everything reconciles", "すべて一致しております") : t("Something doesn’t reconcile", "一致しない項目がございます")}
          subtitle={t("Ledger totals are recomputed independently from orders and compared.", "台帳の合計を注文データから別途再計算し、照合しています。")}
          action={<Badge tone={allOk ? "ok" : "fail"}>{t(`${s.checks.filter((x) => x.ok).length}/${s.checks.length} checks pass`, `${s.checks.length}件中${s.checks.filter((x) => x.ok).length}件 一致`)}</Badge>}
        />
        <ul className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          {s.checks.map((x) => (
            <li key={x.label} className={cx("flex gap-3 rounded-xl p-3", x.ok ? "bg-ok-soft/50" : "bg-fail-soft/70")}>
              <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white", x.ok ? "bg-ok" : "bg-fail")} aria-hidden>{x.ok ? "✓" : "✕"}</span>
              <div className="text-sm">
                <div className="font-medium">{t(x.label, x.ja?.label ?? x.label)}<span className="sr-only">: {x.ok ? t("passes", "一致") : t("fails", "不一致")}</span></div>
                <div className="text-xs text-moss">{t(x.detail, x.ja?.detail ?? x.detail)}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow={t("Order states", "注文の状況")} title={t("Where every order is", "すべての注文の状況")} subtitle={t("Each order sits in exactly one state.", "各注文は、いずれか1つの状態にあります。")} />
          <table className="w-full text-sm">
            <thead className="border-b border-sand text-xs uppercase tracking-wider text-moss">
              <tr>
                <th className="px-5 py-2 text-left font-medium sm:px-6">{t("State", "状態")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("Orders", "注文数")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("Units", "点数")}</th>
                <th className="px-5 py-2 text-right font-medium sm:px-6">{t("Value", "金額")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {s.buckets.map((b) => (
                <tr key={b.key} className={b.orders ? "" : "text-moss"}>
                  <td className="px-5 py-2 sm:px-6">
                    {b.orders ? <Link href={link(b.key)} className="hover:underline">{t(b.label, b.ja)}</Link> : t(b.label, b.ja)}
                    {BUCKETS.find((x) => x.key === b.key)?.holdsCash && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-moss">{t("holds cash", "決済保持")}</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.orders}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.units}</td>
                  <td className="px-5 py-2 text-right tabular-nums sm:px-6">{formatINR(b.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          {s.pipeline.orders > 0 && (
            <Card>
              <CardHeader eyebrow={t("Projection · not yet earned", "見込み · 未計上")} title={t(`${s.pipeline.units} units paid but not delivered`, `お支払い済み・未お届けの${s.pipeline.units}点`)} subtitle={t("What these would add if every one is delivered.", "すべてお届けした場合に加算される金額です。")} />
              <div className="divide-y divide-sand px-5 sm:px-6">
                <Row t={t} label={t("Net item sales", "商品の純売上")} value={s.pipeline.itemSales} />
                <Row t={t} withYen label={t("Licensor royalty", "ライセンサーへのロイヤリティ")} value={s.pipeline.licensorRoyalty} />
                <Row t={t} label={t("Creator earnings", "クリエイター報酬")} value={s.pipeline.creatorEarnings} />
                <Row t={t} label={t("Torii commission", "Torii手数料")} value={s.pipeline.toriiCommission} />
              </div>
            </Card>
          )}
          <Card className="border-dashed">
            <CardHeader eyebrow={t("Assumptions · not recorded", "前提条件 · 未計上")} title={t("Estimated seller economics", "販売者の収支（試算）")} subtitle={t("Illustrative costs set by the operator. Nothing below is a recorded transaction.", "運営が設定した例示のコストです。以下は計上された取引ではございません。")} />
            <div className="divide-y divide-sand px-5 sm:px-6">
              <Row t={t} label={t("Seller share + shipping charged", "販売者の取り分 ＋ 送料")} value={r.sellerShare + r.shipping} sub={t("Recorded", "計上済み")} />
              <Row t={t} label={t(`Production · ${formatINR(a.costs.productionMinor[a.productId] ?? 0)} × ${r.units} ${productName(a.productId).toLowerCase()}s`, `生産費 · ${formatINR(a.costs.productionMinor[a.productId] ?? 0)} × ${productNameJa(a.productId)}${r.units}点`)} value={-a.productionCost} negative sub={t("Assumption", "前提")} />
              <Row t={t} label={t(`Packaging · ${formatINR(a.costs.packagingMinor)} × ${r.orders} orders`, `梱包費 · ${formatINR(a.costs.packagingMinor)} × ${r.orders}件`)} value={-a.packagingCost} negative sub={t("Assumption", "前提")} />
              <Row t={t} label={t(`Courier · ${formatINR(a.costs.shippingCostMinor)} × ${r.orders} orders`, `配送費 · ${formatINR(a.costs.shippingCostMinor)} × ${r.orders}件`)} value={-a.shippingCost} negative sub={t("Assumption", "前提")} />
              <Row t={t} label={t(`Payment processing · ${bpsToPercent(a.costs.paymentFeeBps)} of captured`, `決済手数料 · 決済額の${bpsToPercent(a.costs.paymentFeeBps)}`)} value={-a.paymentFees} negative sub={t("Assumption; fees on refunded payments assumed not returned", "前提：返金分の手数料は戻らないものとしています")} />
              <Row t={t} label={t("Estimated seller contribution", "販売者の貢献利益（試算）")} value={a.sellerContribution} strong negative={a.sellerContribution < 0} />
            </div>
          </Card>
        </div>
      </div>

      {s.byVersion.length > 0 && (
        <Card>
          <CardHeader eyebrow={t("Versions", "バージョン")} title={t("Sales by approved version", "承認済みバージョン別の販売")} subtitle={t("Orders keep the version, price and terms they were bought under.", "各注文は、購入時のバージョン・価格・条件を保持します。")} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-sand text-xs uppercase tracking-wider text-moss">
                <tr>
                  <th className="px-5 py-2 text-left font-medium sm:px-6">{t("Version", "バージョン")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("Price", "価格")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("Paid orders", "支払い済み注文")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("Delivered units", "お届け済み点数")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("Item sales", "商品売上")}</th>
                  <th className="px-5 py-2 text-right font-medium sm:px-6">{t("Terms (royalty / creator / Torii)", "条件（ロイヤリティ / クリエイター / Torii）")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {s.byVersion.map((v) => (
                  <tr key={v.versionNo}>
                    <td className="px-5 py-2 sm:px-6">v{v.versionNo}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(v.priceMinor)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.orders}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.delivered}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatINR(v.itemSales)}</td>
                    <td className="px-5 py-2 text-right sm:px-6">{bpsToPercent(v.terms.royaltyBps)} / {bpsToPercent(v.terms.creatorBps)} / {bpsToPercent(v.terms.platformBps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card id="orders" className="scroll-mt-24">
        <CardHeader
          eyebrow={t("Underlying orders", "対象の注文")}
          title={
            bucket
              ? `${bucket === "captured" ? t("Orders with a captured payment", "決済済みの注文") : t(ORDER_STATUS[bucket]?.label ?? bucket, ORDER_STATUS[bucket]?.ja ?? bucket)} (${shownOrders.length})`
              : t(`All orders (${s.orders.length})`, `すべての注文（${s.orders.length}件）`)
          }
          action={bucket && <Link href={`/statements/${c.id}#orders`} className="text-sm font-medium text-pine hover:underline">{t("Show all", "すべて表示")}</Link>}
        />
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-card text-xs uppercase tracking-wider text-moss shadow-[0_1px_0_var(--color-sand)]">
              <tr>
                <th className="px-5 py-2 text-left font-medium sm:px-6">{t("Order", "注文")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("Version", "バージョン")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("Status", "状態")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("Qty", "数量")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("Item", "商品")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("Total", "合計")}</th>
                <th className="px-5 py-2 text-left font-medium sm:px-6">{t("Dates", "日付")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {shownOrders.map((o) => (
                <tr key={o.id}>
                  <td className="px-5 py-2 font-mono text-xs sm:px-6">{o.public_ref}{!o.livemode && <span className="ml-1 font-sans text-[10px] text-[#7a5a22]">SIM</span>}</td>
                  <td className="px-3 py-2">v{o.versionNo}</td>
                  <td className="px-3 py-2"><Badge tone={ORDER_STATUS[o.status].tone}>{t(ORDER_STATUS[o.status].label, ORDER_STATUS[o.status].ja)}</Badge></td>
                  <td className="px-3 py-2 text-right tabular-nums">{o.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(o.unit_price_minor * o.quantity)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatINR(o.total_minor)}</td>
                  <td className="px-5 py-2 text-xs text-moss sm:px-6">
                    {o.paid_at ? t(`paid ${formatDate(o.paid_at)}`, `${t.date(o.paid_at)} 支払い`) : t("unpaid", "未払い")}
                    {o.delivered_at && t(` · delivered ${formatDate(o.delivered_at)}`, ` · ${t.date(o.delivered_at)} お届け`)}
                    {o.refunded_at && t(` · refunded ${formatDate(o.refunded_at)}`, ` · ${t.date(o.refunded_at)} 返金`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-moss">{t("Money transfers to the licensor, creator and seller are a future integration. This statement is the record those payouts would be made from.", "ライセンサー・クリエイター・販売者への送金は、今後連携予定の機能です。本明細は、その支払いの根拠となる記録です。円換算額は参考値（₹1＝¥1.8）です。")}</p>
    </div>
  );
}
