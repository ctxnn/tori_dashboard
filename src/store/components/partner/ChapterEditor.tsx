"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { expandFiles, optimise, pool, samplePages, uploadImage } from "@/store/lib/image-client";
import { fmtDate, mediaUrl, type ChapterState } from "@/store/lib/partner";
import { UPLOAD } from "@/store/lib/config";
import type { Lang, PartnerChapter } from "@/store/lib/types";
import { ChapterPill } from "./ui";

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
    if (!items.length) { setMsg({ ok: false, text: "No JPEG, PNG or WebP pages found in what you chose." }); return; }
    const room = UPLOAD.maxPagesPerChapter - list.length;
    if (items.length > room) { setMsg({ ok: false, text: `A chapter can have up to ${UPLOAD.maxPagesPerChapter} pages. ${room} more fit.` }); return; }
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
      setMsg(failed ? { ok: false, text: `${good.length} pages added; ${failed} failed. Try those again.` } : { ok: true, text: `${good.length} page${good.length === 1 ? "" : "s"} added to ${p.langs.find((x) => x.code === l)?.name}.` });
    }
    setTimeout(() => setJobs((js) => (js.every((j) => j.status === "done") ? [] : js)), 1500);
  }

  async function onFiles(files: FileList | File[] | null) {
    if (!files || !p.canEdit) return;
    try { await ingest(await expandFiles(Array.from(files))); } catch (e) { setMsg({ ok: false, text: `Couldn't read those files: ${(e as Error).message}` }); }
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
  const clearAll = () => { if (window.confirm(`Remove all ${list.length} pages in this language?`)) savePages([]); };

  async function saveTitle() {
    if (title.trim() === p.chapter.title) return;
    try { await send(url, "PATCH", { title }); setMsg({ ok: true, text: "Chapter title saved" }); router.refresh(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }
  async function saveRelease() {
    setBusy(true); setMsg(null);
    try {
      const releaseAt = mode === "hold" ? null : mode === "now" ? "now" : new Date(when).toISOString();
      const r = await send(url, "PATCH", { releaseAt });
      const st = r.state as ChapterState;
      setMsg({ ok: true, text: st === "live" ? "Released. Readers can open this chapter now." : st === "scheduled" ? `Scheduled for ${fmtDate(r.chapter.releaseAt, true)} (IST).` : st === "ready" ? (p.seriesLive ? "Ready. It comes out once the chapter before it is out." : "Ready. It comes out as soon as Torii approves the series.") : "Held back as a draft." });
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(`Delete chapter ${p.chapter.number}? Later chapters move up a number.`)) return;
    try { await send(url, "DELETE"); location.href = `/partner/titles/${p.subId}`; } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  }

  return (
    <div>
      <nav className="mb-3 text-[13.5px] text-muted">
        <Link href="/partner/titles" className="hover:underline">Titles</Link> <span aria-hidden>/</span> <Link href={`/partner/titles/${p.subId}`} className="hover:underline">{p.subTitle}</Link> <span aria-hidden>/</span> <span className="text-fg">Chapter {p.chapter.number}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="mr-auto min-w-0">
          <div className="flex items-center gap-2"><ChapterPill state={p.state} /><span className="jp text-[13px] text-muted">第{p.chapter.number}話</span></div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-display text-[clamp(24px,3vw,34px)] leading-none">Chapter {p.chapter.number}</span>
            <input aria-label="Chapter title" className="input max-w-[340px] text-[16px] font-semibold" value={title} disabled={!p.canEdit} maxLength={100}
              onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/partner/titles/${p.subId}/chapters/${p.chapter.id}/preview?lang=${lang}`} target="_blank" className={`btn-ghost ${list.length ? "" : "pointer-events-none opacity-45"}`}>Preview ↗</Link>
          {p.canEdit && !live && <button className="btn-ghost text-bad" onClick={remove}>Delete chapter</button>}
        </div>
      </div>
      {!p.canEdit && <p className="mb-5 rounded-panel border border-line bg-card px-5 py-3.5 text-[14.5px] text-muted">This title is in review, so its chapters are read-only for now.</p>}
      {msg && <p role="alert" className={`mb-4 rounded-xl px-4 py-2.5 text-[14px] font-semibold ${msg.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad"}`}>{msg.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-[18px] font-bold tracking-[-0.02em]">Pages <span className="jp text-[12.5px] font-normal text-muted">原稿</span></h2>
            <div role="tablist" aria-label="Language" className="no-scrollbar flex gap-1.5 overflow-x-auto">
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
              <p className="text-[15px] font-semibold">Drop page images or a .cbz / .zip here</p>
              <p className="mt-1 text-[13.5px] text-muted">Pages are ordered by file name (001, 002…). Each is resized to {UPLOAD.pageWidth}px wide and compressed in your browser, so chapters load fast on Indian mobile data.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-ink min-h-[42px]" onClick={() => fileRef.current?.click()} disabled={uploading}>Choose files</button>
                <button type="button" className="btn-ghost min-h-[42px]" onClick={sample} disabled={uploading || busy}>Generate 8 sample pages</button>
              </div>
            </div>
          )}

          {jobs.length > 0 && (
            <div className="mt-4 rounded-xl bg-fg/[.03] p-3">
              <div className="mb-2 flex justify-between text-[13px] font-semibold"><span>Uploading to {p.langs.find((l) => l.code === lang)?.name}</span><span className="tabular-nums">{jobs.filter((j) => j.status === "done").length}/{jobs.length}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(jobs.filter((j) => j.status === "done" || j.status === "error").length / jobs.length) * 100}%` }} /></div>
              {jobs.some((j) => j.status === "error") && <ul className="mt-2 space-y-0.5 text-[12.5px] text-bad">{jobs.filter((j) => j.status === "error").map((j, i) => <li key={i}>{j.name}: {j.error}</li>)}</ul>}
            </div>
          )}

          {list.length ? (
            <>
              <div className="mb-3 mt-5 flex items-center text-[13px] text-muted">
                <span>{list.length} page{list.length === 1 ? "" : "s"} · drag to reorder</span>
                {p.canEdit && <button className="ml-auto font-semibold text-bad hover:underline" onClick={clearAll}>Remove all</button>}
              </div>
              <ol className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                {list.map((id, i) => (
                  <li key={id} draggable={p.canEdit} onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)}
                    onDragOver={(e) => { if (drag !== null) e.preventDefault(); }} onDrop={(e) => { if (drag !== null) { e.preventDefault(); move(drag, i); setDrag(null); } }}
                    className={`group relative ${drag === i ? "opacity-40" : ""} ${p.canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}>
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-line bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(id)} alt={`Page ${i + 1}`} loading="lazy" className="h-full w-full object-cover object-top" draggable={false} />
                      <span className="absolute left-1.5 top-1.5 rounded-md bg-ink/80 px-1.5 text-[11.5px] font-bold tabular-nums text-white">{i + 1}</span>
                    </div>
                    {p.canEdit && (
                      <div className="mt-1 flex justify-center gap-1 opacity-70 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <button className="rounded-md px-1.5 text-[13px] hover:bg-fg/10" aria-label={`Move page ${i + 1} earlier`} onClick={() => move(i, i - 1)} disabled={i === 0}>←</button>
                        <button className="rounded-md px-1.5 text-[13px] text-bad hover:bg-bad/10" aria-label={`Remove page ${i + 1}`} onClick={() => removeAt(i)}>✕</button>
                        <button className="rounded-md px-1.5 text-[13px] hover:bg-fg/10" aria-label={`Move page ${i + 1} later`} onClick={() => move(i, i + 1)} disabled={i === list.length - 1}>→</button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </>
          ) : <p className="mt-5 text-center text-[14px] text-muted">No pages in {p.langs.find((l) => l.code === lang)?.name} yet.</p>}
        </section>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <section className="panel p-5">
            <div className="text-[16px] font-bold">Release <span className="jp text-[12.5px] font-normal text-muted">配信設定</span></div>
            {live ? (
              <p className="mt-2 text-[14px] text-muted">Out since {fmtDate(p.chapter.releaseAt, true)}. Readers can open it in the Read app.</p>
            ) : (
              <fieldset disabled={!p.canEdit} className="mt-3 space-y-2.5 text-[14px]">
                {([["hold", "Hold as draft", "Not released."], ["now", p.seriesLive ? "Release now" : "Release when approved", p.seriesLive ? "Readers get it straight away." : "Out the moment Torii approves the series."],
                  ["schedule", "Schedule", "Pick a date and time, like a simulpub with Japan."]] as const).map(([v, l, d]) => (
                  <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === v ? "border-fg/50 bg-fg/[.03]" : "border-line"}`}>
                    <input type="radio" name="release" className="mt-1 accent-[rgb(214,0,50)]" checked={mode === v} onChange={() => setMode(v)} />
                    <span><b>{l}</b><br /><span className="text-[13px] text-muted">{d}</span></span>
                  </label>
                ))}
                {mode === "schedule" && (
                  <div className="space-y-2 pl-1">
                    <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Release date and time" />
                    <button type="button" className="chip min-h-[32px] text-[12.5px]" onClick={() => setWhen(toLocalInput(nextJapanMonday()))}>Next Monday 00:00 JST</button>
                    <p className="text-[12.5px] text-muted">Time is in your device&apos;s timezone. Readers in India see it in IST.</p>
                  </div>
                )}
                <button className="btn-primary w-full" onClick={saveRelease} disabled={busy || (!anyPages && mode !== "hold")}>{busy ? "Saving…" : "Save release"}</button>
                {!anyPages && mode !== "hold" && <p className="text-[12.5px] text-warn">Upload pages before releasing.</p>}
              </fieldset>
            )}
          </section>
          <section className="card p-5 text-[13.5px] leading-relaxed text-muted">
            <div className="label mb-2 text-fg">Page guidelines</div>
            <ul className="list-disc space-y-1 pl-4">
              <li>One image per page, in reading order. Spreads can be one wide image.</li>
              <li>Upload each translation under its own language. Readers switch languages in the reader.</li>
              <li>At least 1000px wide looks sharp on phones. JPEG, PNG or WebP.</li>
              <li>Pages are only visible to you and Torii until the chapter is out.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
