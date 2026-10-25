"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { checklist, editable, fmtDate, mediaUrl, STATUS, type ChapterState } from "@/store/lib/partner";
import { optimise, uploadImage } from "@/store/lib/image-client";
import { DEMOGRAPHICS, PARTNER_GENRES } from "@/store/lib/config";
import { LANGS, type Lang, type Submission } from "@/store/lib/types";
import { Cover } from "../Art";
import { ChapterPill, StatusPill } from "./ui";
import { useT } from "@/components/i18n-client";
import { actionJa } from "@/store/lib/partner-i18n";

type Props = {
  sub: Submission; chapterStates: Record<string, ChapterState>; liveSlug: string | null; verified: boolean;
  chapterPrice: number; unlockShare: number; printShare: number; figureShare: number; publisherName: string;
};
type Fields = Pick<Submission, "title" | "titleJa" | "author" | "artist" | "genres" | "demographic" | "seriesStatus" | "synopsis" | "startYear" | "ageRating" | "color" | "rights" | "pricing" | "freeChapters">;
const SWATCHES = ["#d9452b", "#a8342f", "#c94f7c", "#c2762b", "#2f8f4e", "#2f7d6d", "#2563a8", "#3b3f8f", "#4a3a6b", "#1a1625"];
const fieldsOf = (s: Submission): Fields => ({
  title: s.title, titleJa: s.titleJa, author: s.author, artist: s.artist, genres: s.genres, demographic: s.demographic, seriesStatus: s.seriesStatus,
  synopsis: s.synopsis, startYear: s.startYear, ageRating: s.ageRating, color: s.color, rights: s.rights, pricing: s.pricing, freeChapters: s.freeChapters,
});
const send = async (url: string, method: string, data?: unknown) => {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
};

export default function TitleEditor(p: Props) {
  const router = useRouter();
  const t = useT();
  const d = (iso: string | null | undefined, time = false) => fmtDate(iso, time, t.ja ? "ja-JP" : "en-IN");
  // A field label: English with its Japanese alongside, or Japanese alone when the portal is in Japanese.
  const L = (en: string, ja: string) => (t.ja ? <span className="jp">{ja}</span> : <>{en} <span className="jp font-normal text-muted">{ja}</span></>);
  const [saved, setSaved] = useState<Fields>(() => fieldsOf(p.sub));
  const [f, setF] = useState<Fields>(saved);
  const [art, setArt] = useState({ coverId: p.sub.coverId, bannerId: p.sub.bannerId });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [note, setNote] = useState("");
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  const canEdit = editable(p.sub);
  const live = p.sub.status === "approved";
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((x) => ({ ...x, [k]: v }));
  const setRight = <K extends keyof Fields["rights"]>(k: K, v: Fields["rights"][K]) => setF((x) => ({ ...x, rights: { ...x.rights, [k]: v } }));
  const merged = useMemo(() => ({ ...p.sub, ...f, ...art }), [p.sub, f, art]);
  const steps = checklist(merged);
  const ready = steps.every((s) => s.done);
  const lastReview = [...p.sub.history].reverse().find((h) => h.who === "torii");
  const uploaded = new Set(p.sub.chapters.flatMap((c) => Object.entries(c.pages).filter(([, v]) => v?.length).map(([k]) => k)));

  async function run(label: string, fn: () => Promise<unknown>, okText?: string) {
    setBusy(label); setMsg(null);
    try { await fn(); if (okText) setMsg({ ok: true, text: okText }); router.refresh(); return true; }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); return false; }
    finally { setBusy(null); }
  }
  const save = () => run("save", async () => { await send(`/api/partner/submissions/${p.sub.id}`, "PATCH", f); setSaved(f); }, live ? t("Saved. The store shows the changes now.", "保存しました。ストアに反映されております。") : t("Saved", "保存しました"));
  async function submit() {
    if (dirty && !(await run("save", async () => { await send(`/api/partner/submissions/${p.sub.id}`, "PATCH", f); setSaved(f); }))) return;
    await run("submit", () => send(`/api/partner/submissions/${p.sub.id}/status`, "POST", { action: "submit", note }), t("Sent to Torii for review", "審査を申請しました。弊社より追ってご連絡いたします。"));
  }
  const withdraw = () => run("withdraw", () => send(`/api/partner/submissions/${p.sub.id}/status`, "POST", { action: "withdraw" }), t("Withdrawn. You can edit the title again.", "申請を取り下げました。再び編集いただけます。"));
  async function remove() {
    if (!window.confirm(t(`Delete “${p.sub.title}” and all its chapters? This can't be undone.`, `『${p.sub.title}』とすべての話を削除してもよろしいですか？この操作は取り消せません。`))) return;
    if (await run("delete", () => send(`/api/partner/submissions/${p.sub.id}`, "DELETE"))) location.href = "/partner/titles";
  }
  async function addChapter() {
    setBusy("chapter");
    try { const c = await send(`/api/partner/submissions/${p.sub.id}/chapters`, "POST", {}); location.href = `/partner/titles/${p.sub.id}/chapters/${c.id}`; }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); setBusy(null); }
  }
  async function uploadArt(kind: "cover" | "banner", file: File | undefined) {
    if (!file) return;
    await run(kind, async () => {
      const blob = await optimise(file, kind === "cover" ? 900 : 1800, 0.86);
      const up = await uploadImage(blob, kind);
      const key = kind === "cover" ? "coverId" : "bannerId";
      await send(`/api/partner/submissions/${p.sub.id}`, "PATCH", { [key]: up.id });
      setArt((a) => ({ ...a, [key]: up.id }));
    }, kind === "cover" ? t("Cover updated", "表紙を更新しました") : t("Banner updated", "バナーを更新しました"));
  }
  const removeBanner = () => run("banner", async () => { await send(`/api/partner/submissions/${p.sub.id}`, "PATCH", { bannerId: null }); setArt((a) => ({ ...a, bannerId: null })); });

  const dis = !canEdit;
  const chapters = [...p.sub.chapters].sort((a, b) => a.number - b.number);
  const cut = (p.chapterPrice * p.unlockShare).toFixed(2);

  return (
    <div>
      {/* Header */}
      <nav className="mb-3 text-[13.5px] text-muted"><Link href="/partner/titles" className="hover:underline">{t("Titles", "作品管理")}</Link> <span aria-hidden>/</span> <span className="text-fg">{p.sub.title}</span></nav>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2"><StatusPill status={p.sub.status} />{live && p.liveSlug && <span className="text-[13px] text-muted">{t(`since ${d(p.sub.publishedAt)}`, `${d(p.sub.publishedAt)}より配信中`)}</span>}</div>
          <h1 className="mt-2 font-display text-[clamp(26px,3.2vw,38px)] leading-[1.05]">{p.sub.title}</h1>
          {p.sub.titleJa && <div className="jp mt-1 text-[16px] text-muted">{p.sub.titleJa}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {p.liveSlug && <Link href={`/read/${p.liveSlug}`} target="_blank" className="btn-ghost">{t("View in Torii ↗", "Toriiで表示 ↗")}</Link>}
          {p.sub.status === "submitted" && <button className="btn-ghost" onClick={withdraw} disabled={!!busy}>{t("Withdraw from review", "審査の申請を取り下げる")}</button>}
          {!p.sub.publishedAt && p.sub.status !== "submitted" && p.sub.status !== "approved" && <button className="btn-ghost text-bad" onClick={remove} disabled={!!busy}>{t("Delete", "削除")}</button>}
        </div>
      </div>

      {(p.sub.status === "changes_requested" || p.sub.status === "rejected") && lastReview?.note && (
        <div role="status" className={`mb-6 rounded-panel border px-5 py-4 ${p.sub.status === "rejected" ? "border-bad/30 bg-bad/10" : "border-warn/30 bg-warn/10"}`}>
          <div className={`text-[13px] font-bold ${p.sub.status === "rejected" ? "text-bad" : "text-warn"}`}>{t(`${STATUS[p.sub.status].label} · Torii review team, ${d(lastReview.at)}`, `${STATUS[p.sub.status].ja} · Torii審査チームより（${d(lastReview.at)}）`)}</div>
          <p className="mt-1 text-[15px]">“{lastReview.note}”</p>
        </div>
      )}
      {p.sub.status === "submitted" && (
        <div role="status" className="mb-6 rounded-panel border border-line bg-card px-5 py-4 text-[14.5px]">
          <b>{t("In review.", "審査中です。")}</b> <span className="text-muted">{t(`Sent ${d(p.sub.submittedAt, true)}. Editing is paused until Torii replies; withdraw the title if you need to change something.`, `${d(p.sub.submittedAt, true)}に申請いただきました。弊社からのご連絡まで編集は一時停止となります。変更が必要な場合は、申請を取り下げてください。`)}</span>
        </div>
      )}
      {live && (
        <div role="status" className="mb-6 rounded-panel border border-ok/30 bg-ok/10 px-5 py-4 text-[14.5px]">
          <b className="text-ok">{t("Live on Torii.", "Toriiで配信中です。")}</b> <span className="text-fg/80">{t("Changes you save here appear in the store straight away. Add new chapters below and release them now or on a schedule.", "こちらで保存した変更は、すぐにストアへ反映されます。新しい話は下記から追加し、即時または予約で配信いただけます。")}</span>
        </div>
      )}
      {msg && <p role="alert" className={`mb-4 rounded-xl px-4 py-2.5 text-[14px] font-semibold ${msg.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad"}`}>{msg.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Details */}
          <section className="card p-5 sm:p-6">
            <SectionHead n="1" en="Series details" ja="作品情報" />
            <fieldset disabled={dis} className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="field-label">{t("Title in English", "英語タイトル")}</span>
                <input className="input text-[16px] font-semibold" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} /></label>
              <label className="block"><span className="field-label">{L("Original title", "原題")}</span>
                <input className="input jp" lang="ja" value={f.titleJa} onChange={(e) => set("titleJa", e.target.value)} maxLength={120} /></label>
              <label className="block"><span className="field-label">{t("Started serialisation", "連載開始年")}</span>
                <input className="input" type="number" min={1950} max={new Date().getFullYear() + 1} value={f.startYear} onChange={(e) => set("startYear", Number(e.target.value))} /></label>
              <label className="block"><span className="field-label">{L("Author", "作者")}</span>
                <input className="input" value={f.author} onChange={(e) => set("author", e.target.value)} maxLength={80} placeholder={t("As credited on the cover", "表紙の表記どおりにご入力ください")} /></label>
              <label className="block"><span className="field-label">{L("Artist, if different", "作画（作者と異なる場合）")}</span>
                <input className="input" value={f.artist} onChange={(e) => set("artist", e.target.value)} maxLength={80} /></label>
              <label className="block sm:col-span-2"><span className="field-label">{L("Synopsis", "あらすじ")}</span>
                <textarea className="input min-h-[120px] py-3 leading-relaxed" value={f.synopsis} onChange={(e) => set("synopsis", e.target.value)} maxLength={1200}
                  placeholder={t("Two or three sentences readers see on the series page. Avoid spoilers.", "作品ページに表示される2〜3文の紹介文です。ネタバレはお控えください。")} />
                <span className={`field-hint ${f.synopsis.trim().length < 40 ? "text-warn" : ""}`}>{f.synopsis.trim().length}/1200{f.synopsis.trim().length < 40 ? t(", at least 40 characters", "（40文字以上でご入力ください）") : ""}</span></label>
              <div className="sm:col-span-2">
                <span className="field-label">{t(<>Genres <span className="font-normal text-muted">(up to 5)</span></>, <>ジャンル <span className="font-normal text-muted">（5つまで）</span></>)}</span>
                <div className="flex flex-wrap gap-1.5">
                  {PARTNER_GENRES.map((g) => {
                    const on = f.genres.includes(g);
                    return <button type="button" key={g} aria-pressed={on} onClick={() => set("genres", on ? f.genres.filter((x) => x !== g) : f.genres.length < 5 ? [...f.genres, g] : f.genres)}
                      className={`${on ? "chip-on" : "chip"} min-h-[32px] px-3 text-[12.5px]`}>{g}</button>;
                  })}
                </div>
              </div>
              <label className="block"><span className="field-label">{t("Demographic", "対象読者層")}</span>
                <select className="input" value={f.demographic} onChange={(e) => set("demographic", e.target.value)}>
                  <option value="">{t("Not specified", "指定なし")}</option>{DEMOGRAPHICS.map((d) => <option key={d}>{d}</option>)}</select></label>
              <div><span className="field-label">{t("Status in Japan", "日本での連載状況")}</span>
                <Seg value={f.seriesStatus} onChange={(v) => set("seriesStatus", v)} options={[["ongoing", t("Ongoing 連載中", "連載中")], ["completed", t("Completed 完結", "完結")]]} /></div>
              <div><span className="field-label">{t("Age rating", "対象年齢")}</span>
                <Seg value={f.ageRating} onChange={(v) => set("ageRating", v)} options={[["all", t("All ages", "全年齢")], ["13+", "13+"], ["16+", "16+"]]} />
                <span className="field-hint">{t("Torii doesn’t carry 18+ titles.", "18歳以上向けの作品はお取り扱いしておりません。")}</span></div>
              <div><span className="field-label">{t("Jacket colour", "カバーの色")}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {SWATCHES.map((c) => <button type="button" key={c} aria-label={`Colour ${c}`} aria-pressed={f.color === c} onClick={() => set("color", c)}
                    className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-[rgb(var(--card))] transition ${f.color === c ? "ring-2 ring-fg" : "ring-1 ring-black/10"}`} style={{ background: c }} />)}
                  <input type="color" aria-label={t("Custom colour", "色を指定")} value={f.color} onChange={(e) => set("color", e.target.value)} className="h-8 w-10 cursor-pointer rounded-lg border border-line bg-card" />
                </div>
                <span className="field-hint">{t("Used for the generated jacket and loading states.", "自動生成のカバーや読み込み中の表示に使用します。")}</span></div>
            </fieldset>
          </section>

          {/* Artwork */}
          <section className="card p-5 sm:p-6">
            <SectionHead n="2" en="Artwork" ja="カバー画像" />
            <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
              <div>
                <span className="field-label">{t("Cover (2:3)", "表紙（2:3）")}</span>
                <Cover title={f.title} color={f.color} image={art.coverId ? mediaUrl(art.coverId) : undefined} size="md" />
                <FileButton label={art.coverId ? t("Replace cover", "表紙を差し替える") : t("Upload cover", "表紙をアップロード")} disabled={dis || !!busy} busy={busy === "cover"} onFile={(file) => uploadArt("cover", file)} />
              </div>
              <div>
                <span className="field-label">{t("Banner (wide, optional)", "バナー（横長・任意）")}</span>
                <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-line bg-fg/[.04]">
                  {art.bannerId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(art.bannerId)} alt="Banner" className="h-full w-full object-cover" />
                  ) : <div className="flex h-full items-center justify-center px-6 text-center text-[13.5px] text-muted">{t("Shown behind the series header and on the Read billboard. Without one, the cover is used.", "作品ページの上部やトップのおすすめ枠に表示されます。未設定の場合は表紙を使用します。")}</div>}
                </div>
                <div className="flex gap-2">
                  <FileButton label={art.bannerId ? t("Replace banner", "バナーを差し替える") : t("Upload banner", "バナーをアップロード")} disabled={dis || !!busy} busy={busy === "banner"} onFile={(file) => uploadArt("banner", file)} />
                  {art.bannerId && !dis && <button type="button" className="btn-ghost mt-3 min-h-[40px] px-4 text-[13.5px]" onClick={removeBanner} disabled={!!busy}>{t("Remove", "削除")}</button>}
                </div>
                <p className="mt-3 text-[12.5px] text-muted">{t("JPEG, PNG or WebP. Images are resized and compressed in your browser before upload.", "JPEG・PNG・WebPに対応しております。画像はアップロード前に、ブラウザ上でサイズ調整・圧縮されます。")}</p>
              </div>
            </div>
          </section>

          {/* Rights & pricing */}
          <section className="card p-5 sm:p-6">
            <SectionHead n="3" en="Rights and pricing for India" ja="許諾範囲・価格" />
            <fieldset disabled={dis} className="space-y-5">
              <div>
                <span className="field-label">{t(<>Languages you license <span className="font-normal text-muted">(you upload pages per language)</span></>, <>許諾いただく言語 <span className="font-normal text-muted">（言語ごとに原稿をアップロードいただきます）</span></>)}</span>
                <div className="flex flex-wrap gap-2">
                  {LANGS.map((l) => {
                    const on = f.rights.languages.includes(l.code);
                    const locked = on && uploaded.has(l.code);
                    return (
                      <button type="button" key={l.code} aria-pressed={on} title={locked ? t("Pages are uploaded in this language", "この言語の原稿はアップロード済みです") : undefined}
                        onClick={() => !locked && setRight("languages", on ? f.rights.languages.filter((x) => x !== l.code) : [...f.rights.languages, l.code as Lang])}
                        className={`${on ? "chip-on" : "chip"} ${locked ? "cursor-default" : ""}`}>{on ? "✓ " : ""}{l.name} <span className="ml-1.5 opacity-70">{l.native !== l.name ? l.native : ""}</span></button>
                    );
                  })}
                </div>
                <span className="field-hint">{t("Have the pages translated yourself, or license the language and Torii’s localisation partners will quote for it.", "翻訳は貴社でご用意いただくか、言語を許諾いただければToriiの翻訳パートナーがお見積もりいたします。")}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Toggle on={f.rights.digital} onChange={(v) => setRight("digital", v)} title="Digital reading" ja="電子配信" body={t(`Chapters in the Read app. You earn ₹${cut} of every ₹${p.chapterPrice} unlock.`, `リーダーアプリで各話を配信します。1話₹${p.chapterPrice}のうち₹${cut}が貴社の収益となります。`)} required />
                <Toggle on={f.rights.print} onChange={(v) => setRight("print", v)} title="India print edition" ja="紙書籍" body={t(`Torii prints volumes in India from ₹299. ${Math.round(p.printShare * 100)}% royalty.`, `インド国内で単行本を印刷します（₹299〜）。印税${Math.round(p.printShare * 100)}%。`)} />
                <Toggle on={f.rights.merch} onChange={(v) => setRight("merch", v)} title="Merchandise" ja="グッズ" body={t(`Licensed figures and goods, authenticity-tagged. ${Math.round(p.figureShare * 100)}% royalty.`, `正規品タグ付きのライセンスフィギュア・グッズです。ライセンス料${Math.round(p.figureShare * 100)}%。`)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="field-label">{t("Licence term", "許諾期間")}</span>
                  <select className="input" value={f.rights.termYears} onChange={(e) => setRight("termYears", Number(e.target.value))}>
                    {[1, 2, 3, 5, 7, 10].map((y) => <option key={y} value={y}>{t(`${y} year${y > 1 ? "s" : ""}`, `${y}年`)}</option>)}</select></label>
                <div><span className="field-label">{t("Exclusivity in India", "インドでの独占契約")}</span>
                  <Seg value={f.rights.exclusive ? "yes" : "no"} onChange={(v) => setRight("exclusive", v === "yes")} options={[["yes", t("Exclusive to Torii", "Toriiとの独占")], ["no", t("Non-exclusive", "非独占")]]} /></div>
              </div>
              <div>
                <span className="field-label">{t("Reader pricing", "読者向け価格")}</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`card flex cursor-pointer gap-3 p-4 ${f.pricing === "platform" ? "border-fg/50 ring-2 ring-fg/10" : ""}`}>
                    <input type="radio" name="pricing" className="mt-1 accent-[rgb(214,0,50)]" checked={f.pricing === "platform"} onChange={() => set("pricing", "platform")} />
                    <span className="text-[14px]"><b>{t("Torii standard", "Torii標準")}</b><br /><span className="text-muted">{t("First ", "最初の")}<input type="number" min={0} max={20} value={f.freeChapters} onChange={(e) => set("freeChapters", Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                      className="mx-1 w-14 rounded-md border border-line bg-card px-1.5 py-0.5 text-center text-fg" aria-label={t("Free chapters", "無料話数")} />{t(` chapters free, then ₹${p.chapterPrice} each. Everything is free while Torii runs its launch period.`, `話は無料、以降は1話₹${p.chapterPrice}です。Toriiのローンチ期間中は、すべて無料でお読みいただけます。`)}</span></span>
                  </label>
                  <label className={`card flex cursor-pointer gap-3 p-4 ${f.pricing === "free" ? "border-fg/50 ring-2 ring-fg/10" : ""}`}>
                    <input type="radio" name="pricing" className="mt-1 accent-[rgb(214,0,50)]" checked={f.pricing === "free"} onChange={() => set("pricing", "free")} />
                    <span className="text-[14px]"><b>{t("Free to read", "無料公開")}</b><br /><span className="text-muted">{t("Build an audience first; earn from print and merchandise. You can switch to paid later.", "まず読者を増やし、単行本やグッズで収益化する方法です。後から有料へ切り替えることも可能です。")}</span></span>
                  </label>
                </div>
              </div>
            </fieldset>
          </section>

          {/* Chapters */}
          <section className="card p-5 sm:p-6">
            <SectionHead n="4" en="Chapters" ja="話数・原稿" action={canEdit && <button className="btn-ink min-h-[40px] px-4 text-[14px]" onClick={addChapter} disabled={!!busy}>{busy === "chapter" ? t("Adding…", "追加中…") : t("＋ Add chapter", "＋ 話を追加")}</button>} />
            {chapters.length ? (
              <ul className="divide-y divide-line">
                {chapters.map((c) => {
                  const st = p.chapterStates[c.id] ?? "draft";
                  const langs = LANGS.filter((l) => c.pages[l.code]?.length);
                  return (
                    <li key={c.id}>
                      <Link href={`/partner/titles/${p.sub.id}/chapters/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3 hover:opacity-80">
                        <span className="w-12 font-display text-[20px] tabular-nums text-muted">{String(c.number).padStart(2, "0")}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{c.title}</span>
                          <span className="block text-[12.5px] text-muted">{langs.length ? langs.map((l) => t(`${l.name} ${c.pages[l.code]!.length}p`, `${l.name} ${c.pages[l.code]!.length}ページ`)).join(" · ") : t("No pages yet", "原稿未登録")}</span></span>
                        <span className="text-[12.5px] text-muted">{st === "scheduled" ? d(c.releaseAt, true) : st === "live" ? t(`Out ${d(c.releaseAt)}`, `${d(c.releaseAt)} 配信`) : st === "ready" ? (live ? t("Waiting for the chapter before", "前の話の配信待ち") : t("Out when approved", "承認後に配信")) : ""}</span>
                        <ChapterPill state={st} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-line p-8 text-center">
                <p className="font-semibold">{t("No chapters yet", "まだ話がございません")}</p>
                <p className="mt-1 text-[14px] text-muted">{t("Add chapter 1 and upload its pages: images, or a .cbz/.zip.", "第1話を追加し、原稿（画像、または .cbz/.zip）をアップロードしてください。")}</p>
                {canEdit && <button className="btn-primary mt-4" onClick={addChapter} disabled={!!busy}>{t("Add chapter 1", "第1話を追加")}</button>}
              </div>
            )}
          </section>
        </div>

        {/* Side: checklist, preview, history */}
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {(p.sub.status === "draft" || p.sub.status === "changes_requested") && (
            <section className="panel p-5">
              <div className="text-[16px] font-bold">{t("Ready for review?", "審査申請の準備")}</div>
              <ul className="mt-3 space-y-2 text-[14px]">
                {steps.map((s) => (
                  <li key={s.key} className="flex gap-2.5">
                    <span aria-hidden className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.done ? "bg-ok text-white" : "border border-line text-transparent"}`}>✓</span>
                    <span className={s.done ? "text-muted line-through decoration-fg/20" : ""}>{t(s.label, s.ja)}</span>
                  </li>
                ))}
              </ul>
              <textarea className="input mt-4 min-h-[72px] py-2.5 text-[14px]" placeholder={t("Note for the Torii team (optional)", "Toriiへのご連絡事項（任意）")} value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} />
              <button className="btn-primary mt-3 w-full" disabled={!ready || !!busy} onClick={submit}>
                {busy === "submit" ? t("Sending…", "送信中…") : p.sub.status === "changes_requested" ? t("Send back for review", "修正して再申請") : t("Send for review", "審査を申請する")}
              </button>
              {!p.verified && <p className="mt-2 text-[12.5px] text-muted">{t("Torii can review it now; it goes live once your company is verified.", "審査は今すぐ可能です。配信は貴社の確認完了後に開始されます。")}</p>}
            </section>
          )}

          <section className="card p-5">
            <div className="label mb-3">{t("How readers will see it", "読者からの見え方")}</div>
            <div data-section="read" className="overflow-hidden rounded-xl border border-line bg-[rgb(var(--paper))] p-4">
              <div className="flex gap-3">
                <div className="w-[84px] shrink-0"><Cover title={f.title} color={f.color} image={art.coverId ? mediaUrl(art.coverId) : undefined} size="sm" /></div>
                <div className="min-w-0 self-end">
                  <div className="font-display text-[17px] leading-tight">{f.title || t("Untitled", "無題")}</div>
                  <div className="mt-1 text-[12.5px] font-semibold">{f.author || t("Author", "作者")}</div>
                  <div className="text-[12px] text-muted">{t(`${p.publisherName}, since ${f.startYear}`, `${p.publisherName} · ${f.startYear}年〜`)}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">{f.genres.slice(0, 3).map((g) => <span key={g} className="rounded bg-card/70 px-1.5 text-[11px] font-semibold">{g}</span>)}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-[12.5px] leading-relaxed">{f.synopsis || t("Your synopsis appears here.", "あらすじがここに表示されます。")}</p>
            </div>
          </section>

          <section className="card p-5">
            <div className="label mb-3">{t(<>History <span className="jp font-normal">履歴</span></>, "履歴")}</div>
            <ol className="space-y-3">
              {[...p.sub.history].reverse().slice(0, 10).map((h, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px]">
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${h.who === "torii" ? "bg-accent" : "bg-fg/30"}`} />
                  <div><div><b>{h.who === "torii" ? "Torii" : h.by}</b> · {t(h.action, actionJa(h.action))}</div>
                    {h.note && <div className="mt-0.5 text-muted">“{h.note}”</div>}
                    <div className="text-[12px] text-muted">{d(h.at, true)}</div></div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      {/* Save bar */}
      {canEdit && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[rgb(var(--card)/.95)] backdrop-blur lg:left-[256px]">
          <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-5 py-3 sm:px-8">
            <span className="mr-auto text-[14px] font-semibold">{t("You have unsaved changes", "保存されていない変更がございます")}</span>
            <button className="btn-ghost min-h-[42px]" onClick={() => setF(saved)} disabled={!!busy}>{t("Discard", "破棄")}</button>
            <button className="btn-primary min-h-[42px]" onClick={save} disabled={!!busy || !f.title.trim()}>{busy === "save" ? t("Saving…", "保存中…") : t("Save changes", "変更を保存")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHead({ n, en, ja, action }: { n: string; en: string; ja: string; action?: React.ReactNode }) {
  const t = useT();
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fg text-[13px] font-bold text-bg">{n}</span>
      <h2 className={`text-[18px] font-bold tracking-[-0.02em] ${t.ja ? "jp" : ""}`}>{t(en, ja)}</h2>
      {!t.ja && <span className="jp text-[12.5px] text-muted">{ja}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-xl border border-line p-1" role="radiogroup">
      {options.map(([v, l]) => (
        <button type="button" key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`flex-1 rounded-lg px-2 py-2 text-[13px] font-semibold transition ${value === v ? "bg-ink text-white dark:bg-fg dark:text-bg" : "text-muted hover:text-fg"}`}>{l}</button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, title, ja, body, required }: { on: boolean; onChange: (v: boolean) => void; title: string; ja: string; body: string; required?: boolean }) {
  const t = useT();
  return (
    <button type="button" aria-pressed={on} onClick={() => onChange(!on)}
      className={`card flex flex-col items-start gap-1 p-4 text-left transition ${on ? "border-fg/50 ring-2 ring-fg/10" : "opacity-80 hover:opacity-100"}`}>
      <span className="flex w-full items-center gap-2">
        <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${on ? "bg-ok" : "bg-fg/15"}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`} /></span>
        <b className={`text-[14px] ${t.ja ? "jp" : ""}`}>{t(title, ja)}</b>{!t.ja && <span className="jp text-[11.5px] text-muted">{ja}</span>}
      </span>
      <span className="text-[12.5px] leading-snug text-muted">{body}{required && !on ? t(" Required.", "（必須）") : ""}</span>
    </button>
  );
}

function FileButton({ label, onFile, disabled, busy }: { label: string; onFile: (f: File | undefined) => void; disabled?: boolean; busy?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const t = useT();
  return (
    <>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" className="btn-ghost mt-3 min-h-[40px] w-full px-4 text-[13.5px]" disabled={disabled} onClick={() => ref.current?.click()}>{busy ? t("Uploading…", "アップロード中…") : label}</button>
    </>
  );
}
