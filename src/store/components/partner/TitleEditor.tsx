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
  const save = () => run("save", async () => { await send(`/api/partner/submissions/${p.sub.id}`, "PATCH", f); setSaved(f); }, live ? "Saved. The store shows the changes now." : "Saved");
  async function submit() {
    if (dirty && !(await run("save", async () => { await send(`/api/partner/submissions/${p.sub.id}`, "PATCH", f); setSaved(f); }))) return;
    await run("submit", () => send(`/api/partner/submissions/${p.sub.id}/status`, "POST", { action: "submit", note }), "Sent to Torii for review");
  }
  const withdraw = () => run("withdraw", () => send(`/api/partner/submissions/${p.sub.id}/status`, "POST", { action: "withdraw" }), "Withdrawn. You can edit the title again.");
  async function remove() {
    if (!window.confirm(`Delete “${p.sub.title}” and all its chapters? This can't be undone.`)) return;
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
    }, `${kind === "cover" ? "Cover" : "Banner"} updated`);
  }
  const removeBanner = () => run("banner", async () => { await send(`/api/partner/submissions/${p.sub.id}`, "PATCH", { bannerId: null }); setArt((a) => ({ ...a, bannerId: null })); });

  const dis = !canEdit;
  const chapters = [...p.sub.chapters].sort((a, b) => a.number - b.number);
  const cut = (p.chapterPrice * p.unlockShare).toFixed(2);

  return (
    <div>
      {/* Header */}
      <nav className="mb-3 text-[13.5px] text-muted"><Link href="/partner/titles" className="hover:underline">Titles</Link> <span aria-hidden>/</span> <span className="text-fg">{p.sub.title}</span></nav>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2"><StatusPill status={p.sub.status} />{live && p.liveSlug && <span className="text-[13px] text-muted">since {fmtDate(p.sub.publishedAt)}</span>}</div>
          <h1 className="mt-2 font-display text-[clamp(26px,3.2vw,38px)] leading-[1.05]">{p.sub.title}</h1>
          {p.sub.titleJa && <div className="jp mt-1 text-[16px] text-muted">{p.sub.titleJa}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {p.liveSlug && <Link href={`/read/${p.liveSlug}`} target="_blank" className="btn-ghost">View in Torii ↗</Link>}
          {p.sub.status === "submitted" && <button className="btn-ghost" onClick={withdraw} disabled={!!busy}>Withdraw from review</button>}
          {!p.sub.publishedAt && p.sub.status !== "submitted" && p.sub.status !== "approved" && <button className="btn-ghost text-bad" onClick={remove} disabled={!!busy}>Delete</button>}
        </div>
      </div>

      {(p.sub.status === "changes_requested" || p.sub.status === "rejected") && lastReview?.note && (
        <div role="status" className={`mb-6 rounded-panel border px-5 py-4 ${p.sub.status === "rejected" ? "border-bad/30 bg-bad/10" : "border-warn/30 bg-warn/10"}`}>
          <div className={`text-[13px] font-bold ${p.sub.status === "rejected" ? "text-bad" : "text-warn"}`}>{STATUS[p.sub.status].label} · Torii review team, {fmtDate(lastReview.at)}</div>
          <p className="mt-1 text-[15px]">“{lastReview.note}”</p>
        </div>
      )}
      {p.sub.status === "submitted" && (
        <div role="status" className="mb-6 rounded-panel border border-line bg-card px-5 py-4 text-[14.5px]">
          <b>In review.</b> <span className="text-muted">Sent {fmtDate(p.sub.submittedAt, true)}. Editing is paused until Torii replies; withdraw the title if you need to change something.</span>
        </div>
      )}
      {live && (
        <div role="status" className="mb-6 rounded-panel border border-ok/30 bg-ok/10 px-5 py-4 text-[14.5px]">
          <b className="text-ok">Live on Torii.</b> <span className="text-fg/80">Changes you save here appear in the store straight away. Add new chapters below and release them now or on a schedule.</span>
        </div>
      )}
      {msg && <p role="alert" className={`mb-4 rounded-xl px-4 py-2.5 text-[14px] font-semibold ${msg.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad"}`}>{msg.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Details */}
          <section className="card p-5 sm:p-6">
            <SectionHead n="1" en="Series details" ja="作品情報" />
            <fieldset disabled={dis} className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="field-label">Title in English</span>
                <input className="input text-[16px] font-semibold" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} /></label>
              <label className="block"><span className="field-label">Original title <span className="jp font-normal text-muted">原題</span></span>
                <input className="input jp" lang="ja" value={f.titleJa} onChange={(e) => set("titleJa", e.target.value)} maxLength={120} /></label>
              <label className="block"><span className="field-label">Started serialisation</span>
                <input className="input" type="number" min={1950} max={new Date().getFullYear() + 1} value={f.startYear} onChange={(e) => set("startYear", Number(e.target.value))} /></label>
              <label className="block"><span className="field-label">Author <span className="jp font-normal text-muted">作者</span></span>
                <input className="input" value={f.author} onChange={(e) => set("author", e.target.value)} maxLength={80} placeholder="As credited on the cover" /></label>
              <label className="block"><span className="field-label">Artist, if different <span className="jp font-normal text-muted">作画</span></span>
                <input className="input" value={f.artist} onChange={(e) => set("artist", e.target.value)} maxLength={80} /></label>
              <label className="block sm:col-span-2"><span className="field-label">Synopsis <span className="jp font-normal text-muted">あらすじ</span></span>
                <textarea className="input min-h-[120px] py-3 leading-relaxed" value={f.synopsis} onChange={(e) => set("synopsis", e.target.value)} maxLength={1200}
                  placeholder="Two or three sentences readers see on the series page. Avoid spoilers." />
                <span className={`field-hint ${f.synopsis.trim().length < 40 ? "text-warn" : ""}`}>{f.synopsis.trim().length}/1200{f.synopsis.trim().length < 40 ? ", at least 40 characters" : ""}</span></label>
              <div className="sm:col-span-2">
                <span className="field-label">Genres <span className="font-normal text-muted">(up to 5)</span></span>
                <div className="flex flex-wrap gap-1.5">
                  {PARTNER_GENRES.map((g) => {
                    const on = f.genres.includes(g);
                    return <button type="button" key={g} aria-pressed={on} onClick={() => set("genres", on ? f.genres.filter((x) => x !== g) : f.genres.length < 5 ? [...f.genres, g] : f.genres)}
                      className={`${on ? "chip-on" : "chip"} min-h-[32px] px-3 text-[12.5px]`}>{g}</button>;
                  })}
                </div>
              </div>
              <label className="block"><span className="field-label">Demographic</span>
                <select className="input" value={f.demographic} onChange={(e) => set("demographic", e.target.value)}>
                  <option value="">Not specified</option>{DEMOGRAPHICS.map((d) => <option key={d}>{d}</option>)}</select></label>
              <div><span className="field-label">Status in Japan</span>
                <Seg value={f.seriesStatus} onChange={(v) => set("seriesStatus", v)} options={[["ongoing", "Ongoing 連載中"], ["completed", "Completed 完結"]]} /></div>
              <div><span className="field-label">Age rating</span>
                <Seg value={f.ageRating} onChange={(v) => set("ageRating", v)} options={[["all", "All ages"], ["13+", "13+"], ["16+", "16+"]]} />
                <span className="field-hint">Torii doesn&apos;t carry 18+ titles.</span></div>
              <div><span className="field-label">Jacket colour</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {SWATCHES.map((c) => <button type="button" key={c} aria-label={`Colour ${c}`} aria-pressed={f.color === c} onClick={() => set("color", c)}
                    className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-[rgb(var(--card))] transition ${f.color === c ? "ring-2 ring-fg" : "ring-1 ring-black/10"}`} style={{ background: c }} />)}
                  <input type="color" aria-label="Custom colour" value={f.color} onChange={(e) => set("color", e.target.value)} className="h-8 w-10 cursor-pointer rounded-lg border border-line bg-card" />
                </div>
                <span className="field-hint">Used for the generated jacket and loading states.</span></div>
            </fieldset>
          </section>

          {/* Artwork */}
          <section className="card p-5 sm:p-6">
            <SectionHead n="2" en="Artwork" ja="カバー画像" />
            <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
              <div>
                <span className="field-label">Cover (2:3)</span>
                <Cover title={f.title} color={f.color} image={art.coverId ? mediaUrl(art.coverId) : undefined} size="md" />
                <FileButton label={art.coverId ? "Replace cover" : "Upload cover"} disabled={dis || !!busy} busy={busy === "cover"} onFile={(file) => uploadArt("cover", file)} />
              </div>
              <div>
                <span className="field-label">Banner (wide, optional)</span>
                <div className="relative aspect-[21/9] overflow-hidden rounded-xl border border-line bg-fg/[.04]">
                  {art.bannerId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(art.bannerId)} alt="Banner" className="h-full w-full object-cover" />
                  ) : <div className="flex h-full items-center justify-center px-6 text-center text-[13.5px] text-muted">Shown behind the series header and on the Read billboard. Without one, the cover is used.</div>}
                </div>
                <div className="flex gap-2">
                  <FileButton label={art.bannerId ? "Replace banner" : "Upload banner"} disabled={dis || !!busy} busy={busy === "banner"} onFile={(file) => uploadArt("banner", file)} />
                  {art.bannerId && !dis && <button type="button" className="btn-ghost mt-3 min-h-[40px] px-4 text-[13.5px]" onClick={removeBanner} disabled={!!busy}>Remove</button>}
                </div>
                <p className="mt-3 text-[12.5px] text-muted">JPEG, PNG or WebP. Images are resized and compressed in your browser before upload.</p>
              </div>
            </div>
          </section>

          {/* Rights & pricing */}
          <section className="card p-5 sm:p-6">
            <SectionHead n="3" en="Rights and pricing for India" ja="許諾範囲・価格" />
            <fieldset disabled={dis} className="space-y-5">
              <div>
                <span className="field-label">Languages you license <span className="font-normal text-muted">(you upload pages per language)</span></span>
                <div className="flex flex-wrap gap-2">
                  {LANGS.map((l) => {
                    const on = f.rights.languages.includes(l.code);
                    const locked = on && uploaded.has(l.code);
                    return (
                      <button type="button" key={l.code} aria-pressed={on} title={locked ? "Pages are uploaded in this language" : undefined}
                        onClick={() => !locked && setRight("languages", on ? f.rights.languages.filter((x) => x !== l.code) : [...f.rights.languages, l.code as Lang])}
                        className={`${on ? "chip-on" : "chip"} ${locked ? "cursor-default" : ""}`}>{on ? "✓ " : ""}{l.name} <span className="ml-1.5 opacity-70">{l.native !== l.name ? l.native : ""}</span></button>
                    );
                  })}
                </div>
                <span className="field-hint">Have the pages translated yourself, or license the language and Torii&apos;s localisation partners will quote for it.</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Toggle on={f.rights.digital} onChange={(v) => setRight("digital", v)} title="Digital reading" ja="電子配信" body={`Chapters in the Read app. You earn ₹${cut} of every ₹${p.chapterPrice} unlock.`} required />
                <Toggle on={f.rights.print} onChange={(v) => setRight("print", v)} title="India print edition" ja="紙書籍" body={`Torii prints volumes in India from ₹299. ${Math.round(p.printShare * 100)}% royalty.`} />
                <Toggle on={f.rights.merch} onChange={(v) => setRight("merch", v)} title="Merchandise" ja="グッズ" body={`Licensed figures and goods, authenticity-tagged. ${Math.round(p.figureShare * 100)}% royalty.`} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="field-label">Licence term</span>
                  <select className="input" value={f.rights.termYears} onChange={(e) => setRight("termYears", Number(e.target.value))}>
                    {[1, 2, 3, 5, 7, 10].map((y) => <option key={y} value={y}>{y} year{y > 1 ? "s" : ""}</option>)}</select></label>
                <div><span className="field-label">Exclusivity in India</span>
                  <Seg value={f.rights.exclusive ? "yes" : "no"} onChange={(v) => setRight("exclusive", v === "yes")} options={[["yes", "Exclusive to Torii"], ["no", "Non-exclusive"]]} /></div>
              </div>
              <div>
                <span className="field-label">Reader pricing</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`card flex cursor-pointer gap-3 p-4 ${f.pricing === "platform" ? "border-fg/50 ring-2 ring-fg/10" : ""}`}>
                    <input type="radio" name="pricing" className="mt-1 accent-[rgb(214,0,50)]" checked={f.pricing === "platform"} onChange={() => set("pricing", "platform")} />
                    <span className="text-[14px]"><b>Torii standard</b><br /><span className="text-muted">First <input type="number" min={0} max={20} value={f.freeChapters} onChange={(e) => set("freeChapters", Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                      className="mx-1 w-14 rounded-md border border-line bg-card px-1.5 py-0.5 text-center text-fg" aria-label="Free chapters" /> chapters free, then ₹{p.chapterPrice} each. Everything is free while Torii runs its launch period.</span></span>
                  </label>
                  <label className={`card flex cursor-pointer gap-3 p-4 ${f.pricing === "free" ? "border-fg/50 ring-2 ring-fg/10" : ""}`}>
                    <input type="radio" name="pricing" className="mt-1 accent-[rgb(214,0,50)]" checked={f.pricing === "free"} onChange={() => set("pricing", "free")} />
                    <span className="text-[14px]"><b>Free to read</b><br /><span className="text-muted">Build an audience first; earn from print and merchandise. You can switch to paid later.</span></span>
                  </label>
                </div>
              </div>
            </fieldset>
          </section>

          {/* Chapters */}
          <section className="card p-5 sm:p-6">
            <SectionHead n="4" en="Chapters" ja="話数・原稿" action={canEdit && <button className="btn-ink min-h-[40px] px-4 text-[14px]" onClick={addChapter} disabled={!!busy}>{busy === "chapter" ? "Adding…" : "＋ Add chapter"}</button>} />
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
                          <span className="block text-[12.5px] text-muted">{langs.length ? langs.map((l) => `${l.name} ${c.pages[l.code]!.length}p`).join(" · ") : "No pages yet"}</span></span>
                        <span className="text-[12.5px] text-muted">{st === "scheduled" ? fmtDate(c.releaseAt, true) : st === "live" ? `Out ${fmtDate(c.releaseAt)}` : st === "ready" ? (live ? "Waiting for the chapter before" : "Out when approved") : ""}</span>
                        <ChapterPill state={st} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-line p-8 text-center">
                <p className="font-semibold">No chapters yet</p>
                <p className="mt-1 text-[14px] text-muted">Add chapter 1 and upload its pages: images, or a .cbz/.zip.</p>
                {canEdit && <button className="btn-primary mt-4" onClick={addChapter} disabled={!!busy}>Add chapter 1</button>}
              </div>
            )}
          </section>
        </div>

        {/* Side: checklist, preview, history */}
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {(p.sub.status === "draft" || p.sub.status === "changes_requested") && (
            <section className="panel p-5">
              <div className="text-[16px] font-bold">Ready for review?</div>
              <ul className="mt-3 space-y-2 text-[14px]">
                {steps.map((s) => (
                  <li key={s.key} className="flex gap-2.5">
                    <span aria-hidden className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.done ? "bg-ok text-white" : "border border-line text-transparent"}`}>✓</span>
                    <span className={s.done ? "text-muted line-through decoration-fg/20" : ""}>{s.label}</span>
                  </li>
                ))}
              </ul>
              <textarea className="input mt-4 min-h-[72px] py-2.5 text-[14px]" placeholder="Note for the Torii team (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} />
              <button className="btn-primary mt-3 w-full" disabled={!ready || !!busy} onClick={submit}>
                {busy === "submit" ? "Sending…" : p.sub.status === "changes_requested" ? "Send back for review" : "Send for review"}
              </button>
              {!p.verified && <p className="mt-2 text-[12.5px] text-muted">Torii can review it now; it goes live once your company is verified.</p>}
            </section>
          )}

          <section className="card p-5">
            <div className="label mb-3">How readers will see it</div>
            <div data-section="read" className="overflow-hidden rounded-xl border border-line bg-[rgb(var(--paper))] p-4">
              <div className="flex gap-3">
                <div className="w-[84px] shrink-0"><Cover title={f.title} color={f.color} image={art.coverId ? mediaUrl(art.coverId) : undefined} size="sm" /></div>
                <div className="min-w-0 self-end">
                  <div className="font-display text-[17px] leading-tight">{f.title || "Untitled"}</div>
                  <div className="mt-1 text-[12.5px] font-semibold">{f.author || "Author"}</div>
                  <div className="text-[12px] text-muted">{p.publisherName}, since {f.startYear}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">{f.genres.slice(0, 3).map((g) => <span key={g} className="rounded bg-card/70 px-1.5 text-[11px] font-semibold">{g}</span>)}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-[12.5px] leading-relaxed">{f.synopsis || "Your synopsis appears here."}</p>
            </div>
          </section>

          <section className="card p-5">
            <div className="label mb-3">History <span className="jp font-normal">履歴</span></div>
            <ol className="space-y-3">
              {[...p.sub.history].reverse().slice(0, 10).map((h, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px]">
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${h.who === "torii" ? "bg-accent" : "bg-fg/30"}`} />
                  <div><div><b>{h.who === "torii" ? "Torii" : h.by}</b> · {h.action}</div>
                    {h.note && <div className="mt-0.5 text-muted">“{h.note}”</div>}
                    <div className="text-[12px] text-muted">{fmtDate(h.at, true)}</div></div>
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
            <span className="mr-auto text-[14px] font-semibold">You have unsaved changes</span>
            <button className="btn-ghost min-h-[42px]" onClick={() => setF(saved)} disabled={!!busy}>Discard</button>
            <button className="btn-primary min-h-[42px]" onClick={save} disabled={!!busy || !f.title.trim()}>{busy === "save" ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHead({ n, en, ja, action }: { n: string; en: string; ja: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fg text-[13px] font-bold text-bg">{n}</span>
      <h2 className="text-[18px] font-bold tracking-[-0.02em]">{en}</h2>
      <span className="jp text-[12.5px] text-muted">{ja}</span>
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
  return (
    <button type="button" aria-pressed={on} onClick={() => onChange(!on)}
      className={`card flex flex-col items-start gap-1 p-4 text-left transition ${on ? "border-fg/50 ring-2 ring-fg/10" : "opacity-80 hover:opacity-100"}`}>
      <span className="flex w-full items-center gap-2">
        <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${on ? "bg-ok" : "bg-fg/15"}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`} /></span>
        <b className="text-[14px]">{title}</b><span className="jp text-[11.5px] text-muted">{ja}</span>
      </span>
      <span className="text-[12.5px] leading-snug text-muted">{body}{required && !on ? " Required." : ""}</span>
    </button>
  );
}

function FileButton({ label, onFile, disabled, busy }: { label: string; onFile: (f: File | undefined) => void; disabled?: boolean; busy?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <button type="button" className="btn-ghost mt-3 min-h-[40px] w-full px-4 text-[13.5px]" disabled={disabled} onClick={() => ref.current?.click()}>{busy ? "Uploading…" : label}</button>
    </>
  );
}
