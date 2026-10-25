"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

type K = { reads: number; unlocks: number; unlockRev: number; prints: number; printRev: number; figures: number; figureRev: number; revenue: number };
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const C1 = "#e60033", C2 = "#2643e9", C3 = "#d98e04";

export default function Dashboard({ kpis, bySeries, byLang, byState, trend, topCities, opportunities, scope }: {
  kpis: K; bySeries: { name: string; reads: number; sales: number }[]; byLang: { name: string; reads: number; paid: number }[];
  byState: { name: string; reads: number; revenue: number }[]; trend: { week: string; revenue: number }[]; topCities: [string, number][];
  opportunities: { series: string; lang: string; states: string[]; reads: number }[]; scope: string;
}) {
  const tiles = [
    ["Chapters read", kpis.reads.toLocaleString("en-IN"), "free and paid"],
    ["Paid unlocks", kpis.unlocks.toLocaleString("en-IN"), inr(kpis.unlockRev)],
    ["Print orders", kpis.prints.toLocaleString("en-IN"), inr(kpis.printRev)],
    ["Figure orders", kpis.figures.toLocaleString("en-IN"), inr(kpis.figureRev)],
    ["Revenue to publishers", inr(kpis.revenue), scope],
  ];
  const funnel = [
    { step: "Read a chapter", n: kpis.reads },
    { step: "Paid unlock", n: kpis.unlocks },
    { step: "Bought print", n: kpis.prints },
  ];
  const tip = { contentStyle: { background: "rgb(var(--card))", border: "1px solid rgb(var(--line))", borderRadius: 12, fontSize: 12, color: "rgb(var(--fg))" } };
  const axis = { stroke: "rgb(var(--muted))", fontSize: 11, tickLine: false, axisLine: false } as const;
  const Card = ({ title, children, sub }: { title: string; sub?: string; children: React.ReactNode }) => (
    <div className="card p-4"><div className="text-[16px] font-bold tracking-[-0.02em]">{title}</div>{sub && <div className="mb-2 mt-0.5 text-[12.5px] text-muted">{sub}</div>}{children}</div>
  );
  const sortedSeries = [...bySeries].sort((a, b) => b.reads - a.reads).slice(0, 10);
  const salesSeries = [...bySeries].sort((a, b) => b.sales - a.sales).slice(0, 10);

  return (
    <div className="space-y-3">
      <div data-reveal="stagger" className="grid grid-cols-2 gap-2 ">
        {tiles.map(([l, v, s], k) => <div key={l} className={k === 4 ? "panel paper-band p-3.5" : "card p-3.5"}><div className="label">{l}</div><div data-count className="price mt-1 text-[24px] leading-none">{v}</div><div className="mt-1 text-[12px] text-muted">{s}</div></div>)}
      </div>

      {opportunities.length > 0 && (
        <Card title="Translate next" sub="Readers in these states are reading a series that isn't yet available in their language.">
          <div className="divide-y divide-line">
            {opportunities.map((o) => (
              <div key={o.series + o.lang} className="flex items-center gap-3 py-2 text-sm">
                <span className="rounded-md border border-line bg-card px-2 py-0.5 text-[12px] font-bold dark:border-line">{o.lang}</span>
                <span className="flex-1"><b>{o.series}</b> <span className="text-muted">in {o.states.join(" and ")}</span></span>
                <span className="text-muted">{o.reads} reads</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div data-reveal="stagger" className="grid gap-3 ">
        <Card title="Conversion funnel" sub="Free reading → paid chapters → printed volumes">
          <div className="space-y-2 pt-1">
            {funnel.map((f, i) => (
              <div key={f.step}>
                <div className="flex justify-between text-xs"><span>{f.step}</span><span className="font-semibold">{f.n.toLocaleString("en-IN")}{i > 0 && funnel[0].n ? ` · ${((f.n / funnel[0].n) * 100).toFixed(1)}%` : ""}</span></div>
                <div className="h-6 overflow-hidden rounded bg-line"><div className="h-full rounded" style={{ width: `${Math.max(2, (f.n / Math.max(1, funnel[0].n)) * 100)}%`, background: [C1, C2, C3][i] }} /></div>
              </div>
            ))}
          </div>
        </Card>
        <div className="">
          <Card title="Weekly paid revenue" sub="Chapter unlocks + print + figures">
            <div className="h-48"><ResponsiveContainer><LineChart data={trend}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="week" {...axis} /><YAxis {...axis} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} width={44} /><Tooltip {...tip} formatter={(v: number) => inr(v)} /><Line dataKey="revenue" stroke={C1} strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>
          </Card>
        </div>
      </div>

      <div data-reveal="stagger" className="grid gap-3 ">
        <Card title="Top series by reads">
          <div className="h-72"><ResponsiveContainer><BarChart data={sortedSeries} layout="vertical" margin={{ left: 8 }}><XAxis type="number" {...axis} /><YAxis type="category" dataKey="name" {...axis} width={110} /><Tooltip {...tip} /><Bar dataKey="reads" fill={C1} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Top series by sales">
          <div className="h-72"><ResponsiveContainer><BarChart data={salesSeries} layout="vertical" margin={{ left: 8 }}><XAxis type="number" {...axis} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} /><YAxis type="category" dataKey="name" {...axis} width={110} /><Tooltip {...tip} formatter={(v: number) => inr(v)} /><Bar dataKey="sales" fill={C2} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
      </div>

      <div data-reveal="stagger" className="grid gap-3 ">
        <Card title="By language" sub="Chapter reads and paid unlocks">
          <div className="h-64"><ResponsiveContainer><BarChart data={byLang}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={36} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="reads" name="Reads" fill={C1} radius={[4, 4, 0, 0]} /><Bar dataKey="paid" name="Paid unlocks" fill={C3} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="By state" sub="Reads per state">
          <div className="h-72"><ResponsiveContainer><BarChart data={byState} layout="vertical" barCategoryGap={3}><XAxis type="number" {...axis} /><YAxis type="category" dataKey="name" {...axis} width={104} interval={0} fontSize={10} /><Tooltip {...tip} /><Bar dataKey="reads" fill={C2} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Top cities" sub="All activity">
          <div className="divide-y divide-line">{topCities.map(([c, n], i) => (
            <div key={c} className="flex items-center gap-2 py-1.5 text-sm"><span className="w-4 text-xs text-muted">{i + 1}</span><span className="flex-1">{c}</span><span className="font-semibold">{n}</span></div>
          ))}</div>
        </Card>
      </div>
    </div>
  );
}
