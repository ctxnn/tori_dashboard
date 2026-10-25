import { requirePartner } from "@/store/lib/partner-auth";
import { publisherEvents, shareOf, fmtDate } from "@/store/lib/partner";
import { PARTNER_TERMS, CHAPTER_PRICE } from "@/store/lib/config";
import { Card, PageHead, Stat } from "@/store/components/partner/ui";
import { inr, jpy } from "@/store/components/partner/format";
import Locked from "@/store/components/partner/Locked";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Earnings" };

type Row = { key: string; unlock: number; print: number; figure: number; gross: number; share: number };

export default async function Earnings() {
  const { org, db } = await requirePartner("/partner/earnings");
  const tr = await getT("partner");
  const head = (
    <PageHead
      en="Earnings and statements"
      ja="収益・支払明細"
      sub={tr(
        `Your share under the standard terms (v${PARTNER_TERMS.version}). Statements close monthly and are paid ${PARTNER_TERMS.payoutDays} days after month end.`,
        `標準契約条件（第${PARTNER_TERMS.version}版）に基づく貴社の取り分です。明細は月末締めで、締め日の${PARTNER_TERMS.payoutDays}日後にお支払いいたします。`,
      )}
    />
  );
  if (!org.verified) return <div>{head}<Locked name={org.name} /></div>;

  const ev = publisherEvents(db, org.publisherId).filter((e) => e.type !== "read");
  const months = new Map<string, Row>();
  const titles = new Map<string, { gross: number; share: number; units: number }>();
  for (const e of ev) {
    const key = e.createdAt.slice(0, 7);
    const r = months.get(key) ?? { key, unlock: 0, print: 0, figure: 0, gross: 0, share: 0 };
    const s = shareOf(e);
    r[e.type as "unlock" | "print" | "figure"] += s; r.gross += e.amount; r.share += s;
    months.set(key, r);
    const t = titles.get(e.seriesId) ?? { gross: 0, share: 0, units: 0 };
    t.gross += e.amount; t.share += s; t.units++; titles.set(e.seriesId, t);
  }
  const rows = Array.from(months.values()).sort((a, b) => b.key.localeCompare(a.key));
  const total = rows.reduce((a, r) => a + r.share, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const payDate = (key: string) => { const [y, m] = key.split("-").map(Number); return new Date(Date.UTC(y, m, 1) + PARTNER_TERMS.payoutDays * 864e5); };
  const status = (key: string) =>
    key === thisMonth
      ? { t: tr("Open", "集計中"), c: "text-muted" }
      : payDate(key).getTime() < Date.now()
        ? { t: tr(`Paid ${fmtDate(payDate(key).toISOString(), false, tr.ja ? "ja-JP" : "en-IN")}`, `${fmtDate(payDate(key).toISOString(), false, tr.ja ? "ja-JP" : "en-IN")} お支払い済み`), c: "text-ok" }
        : { t: tr(`Due ${fmtDate(payDate(key).toISOString(), false, tr.ja ? "ja-JP" : "en-IN")}`, `${fmtDate(payDate(key).toISOString(), false, tr.ja ? "ja-JP" : "en-IN")} お支払い予定`), c: "text-warn" };
  const pending = rows.filter((r) => r.key !== thisMonth && payDate(r.key).getTime() >= Date.now()).reduce((a, r) => a + r.share, 0);
  const label = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString(tr.ja ? "ja-JP" : "en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  const top = Array.from(titles.entries()).map(([id, v]) => ({ s: db.series.find((x) => x.id === id), ...v })).filter((x) => x.s).sort((a, b) => b.share - a.share).slice(0, 8);

  return (
    <div className="space-y-6">
      {head}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat strong label={tr("Total earned", "収益合計")} value={inr(total)} sub={tr("your share, all streams", `約${jpy(total)} · すべての収益の貴社取り分`)} />
        <Stat label={tr("Awaiting payment", "お支払い待ち")} value={inr(pending)} sub={tr("closed statements not yet paid", "締め済みで未払いの明細")} />
        <Stat label={tr("This month so far", "今月（集計中）")} value={inr(months.get(thisMonth)?.share ?? 0)} sub={tr("statement still open", "明細は未確定です")} />
        <Stat label={tr("Per chapter unlock", "1話あたり")} value={`₹${(CHAPTER_PRICE * PARTNER_TERMS.unlockShare).toFixed(2)}`} sub={tr(`of ₹${CHAPTER_PRICE}, ${Math.round(PARTNER_TERMS.unlockShare * 100)}% share`, `₹${CHAPTER_PRICE}の${Math.round(PARTNER_TERMS.unlockShare * 100)}%`)} />
      </div>
      <Card title="Monthly statements" ja="月次明細">
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="border-y border-line bg-fg/[.025] text-[12.5px] text-muted">
              <tr><th className="px-5 py-2.5 font-semibold sm:px-6">{tr("Month", "月")}</th><th className="px-3 py-2.5 text-right font-semibold">{tr("Unlocks", "各話購入")} ({Math.round(PARTNER_TERMS.unlockShare * 100)}%)</th><th className="px-3 py-2.5 text-right font-semibold">{tr("Print", "単行本")} ({Math.round(PARTNER_TERMS.printShare * 100)}%)</th><th className="px-3 py-2.5 text-right font-semibold">{tr("Merch", "グッズ")} ({Math.round(PARTNER_TERMS.figureShare * 100)}%)</th><th className="px-3 py-2.5 text-right font-semibold">{tr("Your share", "貴社取り分")}</th><th className="px-5 py-2.5 font-semibold sm:px-6">{tr("Status", "状況")}</th></tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {rows.map((r) => { const st = status(r.key); return (
                <tr key={r.key}><td className="px-5 py-3 font-semibold sm:px-6">{label(r.key)}</td><td className="px-3 py-3 text-right">{inr(r.unlock)}</td><td className="px-3 py-3 text-right">{inr(r.print)}</td><td className="px-3 py-3 text-right">{inr(r.figure)}</td>
                  <td className="px-3 py-3 text-right font-bold">{inr(r.share)}</td><td className={`px-5 py-3 text-[13px] font-semibold sm:px-6 ${st.c}`}>{st.t}</td></tr>
              ); })}
              {!rows.length && <tr><td colSpan={6} className="px-6 py-8 text-center text-muted">{tr("No sales yet. Statements appear after your first unlock or order.", "まだ売上がございません。最初の購入・ご注文の後に明細が表示されます。")}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[12.5px] text-muted">{tr("Amounts in Indian rupees, before withholding tax. Payouts are simulated in this prototype; in production they go by bank transfer in JPY at the day’s rate.", "金額はインドルピー建て・源泉徴収前です。本試作版のお支払いは模擬処理です。本番環境では、当日のレートで日本円に換算し、銀行振込にてお支払いいたします。円換算額は参考値（₹1＝¥1.8）です。")}</p>
      </Card>
      {top.length > 0 && (
        <Card title="By title" ja="作品別">
          <ul className="divide-y divide-line">
            {top.map((t) => (
              <li key={t.s!.id} className="flex items-center gap-3 py-2.5 text-[14px]">
                <span className="min-w-0 flex-1 truncate font-semibold">{t.s!.title}</span>
                <span className="hidden text-muted sm:inline">{tr(`${t.units.toLocaleString("en-IN")} sales · ${inr(t.gross)} gross`, `販売${t.units.toLocaleString("en-IN")}件 · 売上総額${inr(t.gross)}`)}</span>
                <span className="w-24 text-right font-bold tabular-nums">{inr(t.share)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
