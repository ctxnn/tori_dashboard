import "server-only";
import { LANGS, type DB, type Lang } from "./types";

const LOCAL: Record<string, Lang> = { "Tamil Nadu": "ta", Telangana: "te", "Andhra Pradesh": "te", "West Bengal": "bn", Assam: "bn" };

/** Reading and sales analytics for a set of series: the data behind the publisher dashboards. */
export function buildInsights(db: DB, seriesIds: Set<string>) {
  const ev = db.events.filter((e) => seriesIds.has(e.seriesId));
  const sum = (t: string) => ev.filter((e) => e.type === t).reduce((a, e) => a + e.amount, 0);
  const cnt = (t: string) => ev.filter((e) => e.type === t).length;
  const kpis = {
    reads: cnt("read"), unlocks: cnt("unlock"), unlockRev: sum("unlock"), prints: cnt("print"), printRev: sum("print"),
    figures: cnt("figure"), figureRev: sum("figure"), revenue: sum("unlock") + sum("print") + sum("figure"),
  };
  const bySeries = db.series.filter((s) => seriesIds.has(s.id)).map((s) => {
    const e = ev.filter((x) => x.seriesId === s.id);
    return { name: s.title.length > 16 ? s.title.slice(0, 15) + "…" : s.title, reads: e.filter((x) => x.type === "read").length,
      sales: e.filter((x) => x.type !== "read").reduce((a, x) => a + x.amount, 0) };
  });
  const byLang = LANGS.map((l) => ({ name: l.name, reads: ev.filter((e) => e.type === "read" && e.language === l.code).length,
    paid: ev.filter((e) => e.type === "unlock" && e.language === l.code).length }));
  const stateMap = new Map<string, { reads: number; revenue: number }>();
  for (const e of ev) {
    if (e.state === "Unknown") continue;
    const m = stateMap.get(e.state) ?? { reads: 0, revenue: 0 };
    if (e.type === "read") m.reads++; else m.revenue += e.amount;
    stateMap.set(e.state, m);
  }
  const byState = Array.from(stateMap, ([name, v]) => ({ name, ...v })).sort((a, b) => b.reads - a.reads).slice(0, 12);
  const cityMap = new Map<string, number>();
  for (const e of ev) if (e.city !== "Unknown") cityMap.set(`${e.city}, ${e.state}`, (cityMap.get(`${e.city}, ${e.state}`) ?? 0) + 1);
  const topCities = Array.from(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const weeks: Record<string, number> = {};
  for (const e of ev) {
    if (e.type === "read") continue;
    const d = new Date(e.createdAt); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
    const k = d.toISOString().slice(0, 10); weeks[k] = (weeks[k] ?? 0) + e.amount;
  }
  const trend = Object.entries(weeks).sort().slice(-13).map(([k, v]) => ({ week: new Date(k).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), revenue: v }));

  // Audience discovery: regional demand for series that don't yet have the local language.
  const opp: { series: string; lang: string; state: string; reads: number }[] = [];
  for (const s of db.series.filter((x) => seriesIds.has(x.id))) {
    for (const [state, lang] of Object.entries(LOCAL)) {
      if (s.languages.includes(lang)) continue;
      const reads = ev.filter((e) => e.seriesId === s.id && e.state === state && e.type === "read").length;
      if (reads) opp.push({ series: s.title, lang: LANGS.find((l) => l.code === lang)!.name, state, reads });
    }
  }
  const merged = new Map<string, { series: string; lang: string; states: string[]; reads: number }>();
  for (const o of opp) {
    const k = o.series + o.lang; const m = merged.get(k) ?? { series: o.series, lang: o.lang, states: [], reads: 0 };
    m.states.push(o.state); m.reads += o.reads; merged.set(k, m);
  }
  const opportunities = Array.from(merged.values()).sort((a, b) => b.reads - a.reads).slice(0, 5);

  return { kpis, bySeries, byLang, byState, trend, topCities, opportunities };
}
