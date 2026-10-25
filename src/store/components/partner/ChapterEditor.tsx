"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { expandFiles, optimise, pool, samplePages, uploadImage } from "@/store/lib/image-client";
import { fmtDate, mediaUrl, type ChapterState } from "@/store/lib/partner";
import { UPLOAD } from "@/store/lib/config";
import type { Lang, PartnerChapter } from "@/store/lib/types";
import { ChapterPill } from "./ui";
import { useT } from "@/components/i18n-client";

type Props = {
  subId: string; subTitle: string; color: string; chapter: PartnerChapter; state: ChapterState; canEdit: boolean; seriesLive: boolean;
  langs: { code: Lang; name: string; native: string }[];
};
type Job = { name: string; status: "waiting" | "optimising" | "uploading" | "done" | "error"; error?: string };

const send = async (url: string, method: string, data?: unknown) => {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
  return j;
};
/** The next Monday at 00:00 in Japan, when weekly magazines like Shonen Jump release. */
function nextJapanMonday() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 36e5);
  const days = ((8 - jst.getUTCDay()) % 7) || 7;
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + days) - 9 * 36e5);
}
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

export default function ChapterEditor(p: Props) {
  const router = useRouter();
  const t = useT();
  const d = (iso: string | null | undefined, time = false) => fmtDate(iso, time, t.ja ? "ja-JP" : "en-IN");
  const url = `/api/partner/submissions/${p.subId}/chapters/${p.chapter.id}`;
  const [lang, setLang] = useState<Lang>(() => p.langs.find((l) => p.chapter.pages[l.code]?.length)?.code ?? p.langs[0]?.code ?? "en");
  const [pages, setPages] = useState<Partial<Record<Lang, string[]>>>(p.chapter.pages);
  const [title, setTitle] = useState(p.chapter.title);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const isFuture = p.chapter.releaseAt && Date.parse(p.chapter.releaseAt) > Date.now();
  const [mode, setMode] = useState<"hold" | "now" | "schedule">(!p.chapter.releaseAt ? "hold" : isFuture ? "schedule" : "now");
  const [when, setWhen] = useState(toLocalInput(isFuture ? new Date(p.chapter.releaseAt!) : nextJapanMonday()));
  const fileRef = useRef<HTMLInputElement>(null);
  const list = pages[lang] ?? [];
  const live = p.state === "live";
  const anyPages = Object.values(pages).some((v) => v?.length);
  const uploading = jobs.some((j) => j.status !== "done" && j.status !== "error");

  async function savePages(next: string[], l = lang) {
    const prev = pages;
    setPages((x) => ({ ...x, [l]: next }));
    try { await send(url, "PATCH", { lang: l, pages: next }); router.refresh(); return true; }
    catch (e) { setPages(prev); setMsg({ ok: false, text: (e as Error).message }); return false; }
  }

  async function ingest(items: { name: string; blob: Blob }[]) {
    if (!items.length) { setMsg({ ok: false, text: t("No JPEG, PNG or WebP pages found in what you chose.", "選択されたファイルに、JPEG・PNG・WebPの原稿が見つかりませんでした。") }); return; }
    const room = UPLOAD.maxPagesPerChapter - list.length;
    if (items.length > room) { setMsg({ ok: false, text: t(`A chapter can have up to ${UPLOAD.maxPagesPerChapter} pages. ${room} more fit.`, `1話あたり最大${UPLOAD.maxPagesPerChapter}ページまでです。あと${room}ページ追加いただけます。`) }); return; }
    setMsg(null);
    const l = lang, start = list;
    setJobs(items.map((it) => ({ name: it.name, status: "waiting" })));
    const upd = (i: number, j: Partial<Job>) => setJobs((js) => js.map((x, k) => (k === i ? { ...x, ...j } : x)));
    const ids = await pool(items, 3, async (it, i) => {
      try {
        upd(i, { status: "optimising" });
        const blob = await optimise(it.blob, UPLOAD.pageWidth, 0.84);
        upd(i, { status: "uploading" });
        const up = await uploadImage(blob, "page");
        upd(i, { status: "done" });
        return up.id;
      } catch (e) { upd(i, { status: "error", error: (e as Error).message }); return null; }
    });
    const good = ids.filter((x): x is string => !!x);
    if (good.length && (await savePages([...start, ...good], l))) {
      const failed = ids.length - good.length;
      const langName = p.langs.find((x) => x.code === l)?.name;
      setMsg(
        failed
          ? { ok: false, text: t(`${good.length} pages added; ${failed} failed. Try those again.`, `${good.length}ページを追加しました。${failed}ページは失敗しましたので、お手数ですが再度お試しください。`) }
          : { ok: true, text: t(`${good.length} page${good.length === 1 ? "" : "s"} added to ${langName}.`, `${langName}に${good.length}ページを追加しました。`) },
      );
    }
    setTimeout(() => setJobs((js) => (js.every((j) => j.status === "done") ? [] : js)), 1500);
  }

  async function onFiles(files: FileList | File[] | null) {
    if (!files || !p.canEdit) return;
    try { await ingest(await expandFiles(Array.from(files))); } catch (e) { setMsg({ ok: false, text: t(`Couldn't read those files: ${(e as Error).message}`, `ファイルを読み込めませんでした：${(e as Error).message}`) }); }
  }
  async function sample() {
    setBusy(true);
    try { const blobs = await samplePages(8, p.subTitle, p.chapter.number, lang, p.color); await ingest(blobs.map((b, i) => ({ name: `sample-${i + 1}`, blob: b }))); }
    finally { setBusy(false); }
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list]; const [x] = next.splice(from, 1); next.splice(to, 0, x); savePages(next);
  };
  const removeAt = (i: number) => savePages(list.filter((_, k) => k !== i));
  const clearAll = () => { if (window.confirm(t(`Remove all ${list.length} pages in this language?`, `この言語の${list.length}ページをすべて削除してもよろしいですか？`))) savePages([]); };

  async function saveTitle() {
    if (title.trim() === p.chapter.title) return;
    try { await send(url, "PATCH", { title }); setMsg({ ok: true, text: t("Chapter title saved", "サブタイトルを保存しました") }); router.refresh(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }
  async function saveRelease() {
    setBusy(true); setMsg(null);
    try {
      const releaseAt = mode === "hold" ? null : mode === "now" ? "now" : new Date(when).toISOString();
      const r = await send(url, "PATCH", { releaseAt });
      const st = r.state as ChapterState;
      setMsg({
        ok: true,
        text:
          st === "live"
            ? t("Released. Readers can open this chapter now.", "配信しました。読者はすぐにお読みいただけます。")
            : st === "scheduled"
              ? t(`Scheduled for ${d(r.chapter.releaseAt, true)} (IST).`, `${d(r.chapter.releaseAt, true)}（インド標準時）に配信を予約しました。`)
              : st === "ready"
                ? p.seriesLive
                  ? t("Ready. It comes out once the chapter before it is out.", "準備が整いました。前の話の配信後に公開されます。")
                  : t("Ready. It comes out as soon as Torii approves the series.", "準備が整いました。作品の承認後、すぐに公開されます。")
                : t("Held back as a draft.", "下書きとして保存しました。"),
      });
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(t(`Delete chapter ${p.chapter.number}? Later chapters move up a number.`, `第${p.chapter.number}話を削除してもよろしいですか？以降の話の番号は繰り上がります。`))) return;
    try { await send(url, "DELETE"); location.href = `/partner/titles/${p.subId}`; } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }

  return (
    <div>
      <nav className="mb-3 text-[13.5px] text-muted">
        <Link href="/partner/titles" className="hover:underline">{t("Titles", "作品管理")}</Link> <span aria-hidden>/</span> <Link href={`/partner/titles/${p.subId}`} className="hover:underline">{p.subTitle}</Link> <span aria-hidden>/</span> <span className="text-fg">{t(`Chapter ${p.chapter.number}`, `第${p.chapter.number}話`)}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="mr-auto min-w-0">
          <div className="flex items-center gap-2"><ChapterPill state={p.state} />{!t.ja && <span className="jp text-[13px] text-muted">第{p.chapter.number}話</span>}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-display text-[clamp(24px,3vw,34px)] leading-none">{t(`Chapter ${p.chapter.number}`, `第${p.chapter.number}話`)}</span>
            <input aria-label={t("Chapter title", "サブタイトル")} className="input max-w-[340px] text-[16px] font-semibold" value={title} disabled={!p.canEdit} maxLength={100}
              onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/partner/titles/${p.subId}/chapters/${p.chapter.id}/preview?lang=${lang}`} target="_blank" className={`btn-ghost ${list.length ? "" : "pointer-events-none opacity-45"}`}>{t("Preview ↗", "プレビュー ↗")}</Link>
          {p.canEdit && !live && <button className="btn-ghost text-bad" onClick={remove}>{t("Delete chapter", "この話を削除")}</button>}
        </div>
      </div>
      {!p.canEdit && <p className="mb-5 rounded-panel border border-line bg-card px-5 py-3.5 text-[14.5px] text-muted">{t("This title is in review, so its chapters are read-only for now.", "この作品は審査中のため、現在は閲覧のみとなっております。")}</p>}
      {msg && <p role="alert" className={`mb-4 rounded-xl px-4 py-2.5 text-[14px] font-semibold ${msg.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad"}`}>{msg.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-[18px] font-bold tracking-[-0.02em]">{t(<>Pages <span className="jp text-[12.5px] font-normal text-muted">原稿</span></>, <span className="jp">原稿</span>)}</h2>
            <div role="tablist" aria-label={t("Language", "言語")} className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {p.langs.map((l) => (
                <button key={l.code} role="tab" aria-selected={lang === l.code} onClick={() => setLang(l.code)} className={`${lang === l.code ? "chip-on" : "chip"} min-h-[34px]`}>
                  {l.name}<span className="ml-1.5 tabular-nums opacity-60">{pages[l.code]?.length ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {p.canEdit && (
            <div onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
              onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); } }}
              className={`rounded-panel border-2 border-dashed p-6 text-center transition ${over ? "border-accent bg-accentsoft/50" : "border-line"}`}>
              <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,.cbz,.zip" className="sr-only" tabIndex={-1} onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
              <p className="text-[15px] font-semibold">{t("Drop page images or a .cbz / .zip here", "原稿画像、または .cbz / .zip をこちらにドロップしてください")}</p>
              <p className="mt-1 text-[13.5px] text-muted">{t(`Pages are ordered by file name (001, 002…). Each is resized to ${UPLOAD.pageWidth}px wide and compressed in your browser, so chapters load fast on Indian mobile data.`, `ページはファイル名順（001、002…）に並びます。各ページはブラウザ上で幅${UPLOAD.pageWidth}pxに調整・圧縮されるため、インドのモバイル回線でも快適にお読みいただけます。`)}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-ink min-h-[42px]" onClick={() => fileRef.current?.click()} disabled={uploading}>{t("Choose files", "ファイルを選択")}</button>
                <button type="button" className="btn-ghost min-h-[42px]" onClick={sample} disabled={uploading || busy}>{t("Generate 8 sample pages", "サンプル原稿を8ページ生成")}</button>
              </div>
            </div>
          )}

          {jobs.length > 0 && (
            <div className="mt-4 rounded-xl bg-fg/[.03] p-3">
              <div className="mb-2 flex justify-between text-[13px] font-semibold"><span>{t(`Uploading to ${p.langs.find((l) => l.code === lang)?.name}`, `${p.langs.find((l) => l.code === lang)?.name}にアップロード中`)}</span><span className="tabular-nums">{jobs.filter((j) => j.status === "done").length}/{jobs.length}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(jobs.filter((j) => j.status === "done" || j.status === "error").length / jobs.length) * 100}%` }} /></div>
              {jobs.some((j) => j.status === "error") && <ul className="mt-2 space-y-0.5 text-[12.5px] text-bad">{jobs.filter((j) => j.status === "error").map((j, i) => <li key={i}>{j.name}: {j.error}</li>)}</ul>}
            </div>
          )}

          {list.length ? (
            <>
              <div className="mb-3 mt-5 flex items-center text-[13px] text-muted">
                <span>{t(`${list.length} page${list.length === 1 ? "" : "s"} · drag to reorder`, `${list.length}ページ · ドラッグで並べ替えできます`)}</span>
                {p.canEdit && <button className="ml-auto font-semibold text-bad hover:underline" onClick={clearAll}>{t("Remove all", "すべて削除")}</button>}
              </div>
              <ol className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                {list.map((id, i) => (
                  <li key={id} draggable={p.canEdit} onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)}
                    onDragOver={(e) => { if (drag !== null) e.preventDefault(); }} onDrop={(e) => { if (drag !== null) { e.preventDefault(); move(drag, i); setDrag(null); } }}
                    className={`group relative ${drag === i ? "opacity-40" : ""} ${p.canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}>
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-line bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(id)} alt={t(`Page ${i + 1}`, `${i + 1}ページ`)} loading="lazy" className="h-full w-full object-cover object-top" draggable={false} />
                      <span className="absolute left-1.5 top-1.5 rounded-md bg-ink/80 px-1.5 text-[11.5px] font-bold tabular-nums text-white">{i + 1}</span>
                    </div>
                    {p.canEdit && (
                      <div className="mt-1 flex justify-center gap-1 opacity-70 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <button className="rounded-md px-1.5 text-[13px] hover:bg-fg/10" aria-label={t(`Move page ${i + 1} earlier`, `${i + 1}ページを前へ`)} onClick={() => move(i, i - 1)} disabled={i === 0}>←</button>
                        <button className="rounded-md px-1.5 text-[13px] text-bad hover:bg-bad/10" aria-label={t(`Remove page ${i + 1}`, `${i + 1}ページを削除`)} onClick={() => removeAt(i)}>✕</button>
                        <button className="rounded-md px-1.5 text-[13px] hover:bg-fg/10" aria-label={t(`Move page ${i + 1} later`, `${i + 1}ページを後ろへ`)} onClick={() => move(i, i + 1)} disabled={i === list.length - 1}>→</button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </>
          ) : <p className="mt-5 text-center text-[14px] text-muted">{t(`No pages in ${p.langs.find((l) => l.code === lang)?.name} yet.`, `${p.langs.find((l) => l.code === lang)?.name}の原稿はまだございません。`)}</p>}
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <section className="panel p-5">
            <div className="text-[16px] font-bold">{t(<>Release <span className="jp text-[12.5px] font-normal text-muted">配信設定</span></>, <span className="jp">配信設定</span>)}</div>
            {live ? (
              <p className="mt-2 text-[14px] text-muted">{t(`Out since ${d(p.chapter.releaseAt, true)}. Readers can open it in the Read app.`, `${d(p.chapter.releaseAt, true)}より配信中です。リーダーアプリでお読みいただけます。`)}</p>
            ) : (
              <fieldset disabled={!p.canEdit} className="mt-3 space-y-2.5 text-[14px]">
                {([
                  ["hold", t("Hold as draft", "下書きのまま保存"), t("Not released.", "配信しません。")],
                  ["now", p.seriesLive ? t("Release now", "今すぐ配信") : t("Release when approved", "承認後に配信"), p.seriesLive ? t("Readers get it straight away.", "すぐに読者へ公開されます。") : t("Out the moment Torii approves the series.", "作品の承認と同時に公開されます。")],
                  ["schedule", t("Schedule", "配信予約"), t("Pick a date and time, like a simulpub with Japan.", "日本との同時配信のように、日時を指定できます。")],
                ] as const).map(([v, l, desc]) => (
                  <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === v ? "border-fg/50 bg-fg/[.03]" : "border-line"}`}>
                    <input type="radio" name="release" className="mt-1 accent-[rgb(214,0,50)]" checked={mode === v} onChange={() => setMode(v)} />
                    <span><b>{l}</b><br /><span className="text-[13px] text-muted">{desc}</span></span>
                  </label>
                ))}
                {mode === "schedule" && (
                  <div className="space-y-2 pl-1">
                    <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} aria-label={t("Release date and time", "配信日時")} />
                    <button type="button" className="chip min-h-[32px] text-[12.5px]" onClick={() => setWhen(toLocalInput(nextJapanMonday()))}>{t("Next Monday 00:00 JST", "次の月曜日 0:00（日本時間）")}</button>
                    <p className="text-[12.5px] text-muted">{t("Time is in your device’s timezone. Readers in India see it in IST.", "時刻はお使いの端末のタイムゾーンで表示されます。インドの読者にはインド標準時で表示されます。")}</p>
                  </div>
                )}
                <button className="btn-primary w-full" onClick={saveRelease} disabled={busy || (!anyPages && mode !== "hold")}>{busy ? t("Saving…", "保存中…") : t("Save release", "配信設定を保存")}</button>
                {!anyPages && mode !== "hold" && <p className="text-[12.5px] text-warn">{t("Upload pages before releasing.", "配信の前に原稿をアップロードしてください。")}</p>}
              </fieldset>
            )}
          </section>
          <section className="card p-5 text-[13.5px] leading-relaxed text-muted">
            <div className="label mb-2 text-fg">{t("Page guidelines", "原稿のガイドライン")}</div>
            <ul className="list-disc space-y-1 pl-4">
              <li>{t("One image per page, in reading order. Spreads can be one wide image.", "1ページにつき1枚の画像を、読む順にご用意ください。見開きは横長の1枚で結構です。")}</li>
              <li>{t("Upload each translation under its own language. Readers switch languages in the reader.", "翻訳版は、それぞれの言語にアップロードしてください。読者はリーダー内で言語を切り替えられます。")}</li>
              <li>{t("At least 1000px wide looks sharp on phones. JPEG, PNG or WebP.", "幅1000px以上あると、スマートフォンでも鮮明に表示されます。JPEG・PNG・WebPに対応しております。")}</li>
              <li>{t("Pages are only visible to you and Torii until the chapter is out.", "配信開始までは、原稿は貴社とToriiのみが閲覧できます。")}</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
