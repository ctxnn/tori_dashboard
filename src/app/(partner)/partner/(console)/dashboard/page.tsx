import Link from "next/link";
import { requirePartner } from "@/store/lib/partner-auth";
import { checklist, fmtDate, mediaUrl, publisherEvents, releasedChapters, shareOf } from "@/store/lib/partner";
import { Card, PageHead, Stat, StatusPill } from "@/store/components/partner/ui";
import { inr, jpy } from "@/store/components/partner/format";
import { Cover } from "@/store/components/Art";
import { merchForOwner } from "@/store/lib/collabs";
import { getT } from "@/lib/i18n";
import { yen } from "@/lib/i18n-shared";
import { actionJa } from "@/store/lib/partner-i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

export default async function Overview({ searchParams: searchParamsIn }: { searchParams: Promise<{ welcome?: string }> }) { const searchParams = await searchParamsIn;
  const { user, org, db } = await requirePartner();
  const mine = db.submissions.filter((s) => s.orgId === org.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const since = Date.now() - 90 * 864e5;
  const ev = org.verified ? publisherEvents(db, org.publisherId).filter((e) => Date.parse(e.createdAt) > since) : [];
  const earned = ev.reduce((a, e) => a + shareOf(e), 0);
  const liveCount = db.series.filter((s) => s.publisherId === org.publisherId).length;
  const changes = mine.filter((s) => s.status === "changes_requested");
  const drafts = mine.filter((s) => s.status === "draft");
  const review = mine.filter((s) => s.status === "submitted");
  const activity = mine.flatMap((s) => s.history.map((h) => ({ ...h, title: s.title, id: s.id }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const first = user.name.split(" ")[0];
  const merch = merchForOwner(org.name);
  const t = await getT("partner");
  const n = (x: number) => x.toLocaleString("en-IN");
  const loc = t.ja ? "ja-JP" : "en-IN";

  return (
    <div className="space-y-6">
      <PageHead
        en={`Welcome, ${first}`}
        ja={`ようこそ、${first}様`}
        sub={t(
          `${org.name}${org.nameJa ? ` · ${org.nameJa}` : ""} on Torii. Here is what needs you and how your titles are doing in India.`,
          `${org.nameJa || org.name}様のToriiページです。ご対応いただきたい事項と、インドでの作品の状況をまとめております。`,
        )}
      >
        <Link href="/partner/titles/new" className="btn-primary">{t("＋ New title", "＋ 作品を申請")}</Link>
      </PageHead>

      {searchParams.welcome && (
        <div className="panel paper-band p-5">
          <div className="text-[17px] font-bold">{t("Your partner account is ready.", "パートナーアカウントのご登録が完了しました。")}</div>
          <p className="mt-1 text-[14.5px] text-muted">{t(`Start your first title now. Torii is verifying ${org.name}; titles go live once that’s done.`, `さっそく最初の作品の準備を始めていただけます。現在、弊社にて${org.nameJa || org.name}様の確認を進めております。確認完了後に配信が開始されます。`)}</p>
        </div>
      )}
      {!org.verified && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-panel border border-warn/30 bg-warn/10 px-5 py-4 text-[14.5px]">
          <b className="text-warn">{t("Verification pending", "確認中")}</b>
          <span className="text-fg/80">{t(`Torii is checking ${org.name}’s company and rights details (usually two working days). You can prepare and submit titles meanwhile. Sales data appears once you’re verified.`, `弊社にて貴社情報と権利関係を確認しております（通常2営業日）。その間も作品の準備・申請は可能です。販売データは確認完了後に表示されます。`)}</span>
        </div>
      )}

      {(changes.length > 0 || drafts.length > 0 || review.length > 0) && (
        <Card title="Needs your attention" ja="対応が必要な作品">
          <ul className="divide-y divide-line">
            {changes.map((s) => {
              const note = [...s.history].reverse().find((h) => h.who === "torii")?.note;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <StatusPill status={s.status} /><span className="font-semibold">{s.title}</span>
                  {note && <span className="w-full text-[14px] text-muted sm:w-auto sm:flex-1">“{note}”</span>}
                  <Link href={`/partner/titles/${s.id}`} className="btn-ghost ml-auto min-h-[38px] px-4 text-[13.5px]">{t("Fix and resend", "修正して再申請")}</Link>
                </li>
              );
            })}
            {drafts.map((s) => {
              const c = checklist(s), done = c.filter((x) => x.done).length;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <StatusPill status={s.status} /><span className="font-semibold">{s.title}</span>
                  <span className="text-[13.5px] text-muted">{t(`${done} of ${c.length} steps done`, `${c.length}項目中${done}項目 完了`)}</span>
                  <Link href={`/partner/titles/${s.id}`} className="btn-ghost ml-auto min-h-[38px] px-4 text-[13.5px]">{t("Continue", "続ける")}</Link>
                </li>
              );
            })}
            {review.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <StatusPill status={s.status} /><span className="font-semibold">{s.title}</span>
                <span className="text-[13.5px] text-muted">{t(`Sent ${fmtDate(s.submittedAt, false, loc)}. Torii usually replies within 3 working days.`, `${fmtDate(s.submittedAt, false, loc)}に申請済みです。通常3営業日以内にご連絡いたします。`)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {org.verified ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t("Chapters read, 90 days", "閲覧話数（90日）")} value={n(ev.filter((e) => e.type === "read").length)} sub={t("across all your titles", "全作品の合計")} />
          <Stat label={t("Paid unlocks, 90 days", "有料購入（90日）")} value={n(ev.filter((e) => e.type === "unlock").length)} sub={t("₹9 each", "1話₹9")} />
          <Stat label={t("Titles live on Torii", "配信中の作品")} value={String(liveCount)} sub={t(`${mine.filter((s) => s.status === "approved").length} added through the portal`, `うちポータルからの申請：${mine.filter((s) => s.status === "approved").length}作品`)} />
          <Stat strong label={t("Your earnings, 90 days", "貴社の収益（90日）")} value={inr(earned)} sub={t("unlocks, print and merchandise", `約${jpy(earned)} · 各話・単行本・グッズ`)} />
        </div>
      ) : null}

      {merch.kits.length > 0 && (
        <Link href="/partner/merch" className="panel paper-band flex flex-wrap items-center gap-x-6 gap-y-2 p-5 transition hover:brightness-[1.02]">
          <div className="min-w-0">
            <div className="jp text-[12.5px] text-accent">{t("グッズ・コラボ", "Merch collabs")}</div>
            <div className="text-[17px] font-bold tracking-[-0.02em]">{t(`Merch collabs from ${merch.kits.map((k) => k.property).join(", ")}`, `『${merch.kits.map((k) => k.property).join("』『")}』のグッズ・コラボ`)}</div>
            <div className="text-[14px] text-muted">
              {t(
                `${merch.collabs.length} collaborations by Indian creators · ${merch.unitsBacked} units backed · ${merch.royalty} royalty`,
                `インドのクリエイターによるコラボ${merch.collabs.length}件 · 予約${merch.unitsBacked}点 · ロイヤリティ${merch.royalty}（約${yen(merch.royaltyMinor)}）`,
              )}
            </div>
          </div>
          {merch.awaitingApproval > 0 && <span className="pill bg-warn/10 text-warn ring-warn/30">{t(`${merch.awaitingApproval} to approve`, `承認待ち ${merch.awaitingApproval}件`)}</span>}
          <span className="ml-auto font-semibold text-accent">{t("Open →", "開く →")}</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Your titles" ja="作品" action={<Link href="/partner/titles" className="text-[13.5px] font-semibold text-accent">{t("All titles", "すべての作品")}</Link>}>
          {mine.length ? (
            <ul className="divide-y divide-line">
              {mine.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link href={`/partner/titles/${s.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                    <div className="w-11 shrink-0"><Cover title={s.title} color={s.color} image={s.coverId ? mediaUrl(s.coverId) : undefined} size="sm" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{s.title}</div>
                      <div className="truncate text-[13px] text-muted">{s.titleJa && <span className="jp mr-2">{s.titleJa}</span>}{t(`${s.chapters.length} chapter${s.chapters.length === 1 ? "" : "s"}${s.status === "approved" ? `, ${releasedChapters(s).length} live` : ""}`, `全${s.chapters.length}話${s.status === "approved" ? `（配信中${releasedChapters(s).length}話）` : ""}`)}</div>
                    </div>
                    <StatusPill status={s.status} ja={false} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-8 text-center">
              <p className="font-semibold">{t("No titles yet", "まだ作品がございません")}</p>
              <p className="mt-1 text-[14px] text-muted">{t("Add your first series: details, cover, rights, then chapters.", "作品情報、表紙、権利範囲、各話の順にご登録ください。")}</p>
              <Link href="/partner/titles/new" className="btn-primary mt-4">{t("Start a title", "作品を登録する")}</Link>
            </div>
          )}
        </Card>
        <Card title="Recent activity" ja="履歴">
          {activity.length ? (
            <ol className="space-y-3.5">
              {activity.map((a, i) => (
                <li key={i} className="flex gap-3 text-[14px]">
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.who === "torii" ? "bg-accent" : "bg-fg/30"}`} />
                  <div className="min-w-0">
                    <div><Link href={`/partner/titles/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>: {t(a.action, actionJa(a.action))}</div>
                    {a.note && <div className="mt-0.5 text-[13.5px] text-muted">“{a.note}”</div>}
                    <div className="mt-0.5 text-[12px] text-muted">{a.who === "torii" ? "Torii" : a.by} · {fmtDate(a.at, true, loc)}</div>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-[14px] text-muted">{t("Reviews, releases and changes to your titles show up here.", "作品の審査・配信・変更の履歴がこちらに表示されます。")}</p>}
        </Card>
      </div>
    </div>
  );
}
