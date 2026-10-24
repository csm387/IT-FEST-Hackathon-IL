import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { PageHeader, Panel, axis, chartTooltip, ron } from "@/components/solar/ui";
import { getSites, siteDay, sumDay } from "@/lib/fleet";
import { paybackYears, roiPercent } from "@/lib/energy";

export const Route = createFileRoute("/_console/finance")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Financial Tracking — GridPulse" },
    { name: "description", content: "Cost, savings, export revenue, ROI and payback per installation in RON." },
    { property: "og:title", content: "Financial Tracking — GridPulse" },
    { property: "og:description", content: "Cost, savings, ROI and payback per solar installation." },
  ]}),
  component: Finance,
});


function Finance() {
  const [retail, setRetail] = useState(1.3);
  const [exportP, setExportP] = useState(0.45);
  const [maintPct, setMaintPct] = useState(1);
  const rows = useMemo(() => getSites().map((s) => {
    const t = sumDay(siteDay(s));
    const yearFactor = 365 * 0.72; // seasonal average vs October day
    const selfKWh = (t.solar - t.export) * yearFactor, exportKWh = t.export * yearFactor, importKWh = t.import * yearFactor;
    const selfValue = selfKWh * retail, exportRev = exportKWh * exportP, purchase = importKWh * retail;
    const maint = s.installCostRON * (maintPct / 100);
    const annual = selfValue + exportRev;
    const lost = Math.max(0, t.expected - t.solar) * yearFactor * retail;
    return { s, selfValue, exportRev, purchase, maint, annual, net: purchase + maint - exportRev, payback: paybackYears(s.installCostRON, annual, maint), roi: roiPercent(s.installCostRON, (annual - maint) * 25), lost };
  }).sort((a, b) => b.roi - a.roi), [retail, exportP, maintPct]);
  const tot = rows.reduce((a, r) => ({ cost: a.cost + r.s.installCostRON, self: a.self + r.selfValue, exp: a.exp + r.exportRev, pur: a.pur + r.purchase, m: a.m + r.maint, lost: a.lost + r.lost, annual: a.annual + r.annual }), { cost: 0, self: 0, exp: 0, pur: 0, m: 0, lost: 0, annual: 0 });

  const netAnnual = tot.annual - tot.m;
  const payback = tot.cost / netAnnual;
  const roi = Math.round(roiPercent(tot.cost, netAnnual * 25));
  const cashflow = Array.from({ length: 26 }, (_, y) => ({ year: y, value: Math.round(-tot.cost + netAnnual * y) }));
  const mix = [
    { name: "Self-consumed value", value: Math.round(tot.self), color: "var(--solar)" },
    { name: "Export credits", value: Math.round(tot.exp), color: "var(--battery)" },
    { name: "Maintenance", value: Math.round(tot.m), color: "var(--warning)" },
    { name: "Lost to underperformance", value: Math.round(tot.lost), color: "var(--destructive)" },
  ];
  const mixTotal = mix.reduce((a, b) => a + b.value, 0);
  const maxRoi = Math.max(...rows.map((r) => r.roi));
  const top = [...rows].sort((a, b) => b.annual - a.annual).slice(0, 8).map((r) => ({ name: r.s.name, self: Math.round(r.selfValue), exp: Math.round(r.exportRev) }));

  return (
    <div>
      <PageHeader title="Financial tracking" subtitle="Annualised from measured (simulated) energy flows. All RON values are estimates." />

      {/* Hero summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <p className="text-sm text-muted-foreground">Portfolio value created per year</p>
          <p className="num mt-2 text-5xl font-semibold">{ron(tot.annual)} <span className="text-lg font-normal text-muted-foreground">RON</span></p>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted">
            <span className="h-full bg-solar transition-all duration-500" style={{ width: `${(tot.self / tot.annual) * 100}%` }} />
            <span className="h-full bg-battery transition-all duration-500" style={{ width: `${(tot.exp / tot.annual) * 100}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-solar" />Self-consumed <span className="num">{ron(tot.self)}</span></span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-battery" />Export credits <span className="num">{ron(tot.exp)}</span></span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
            <Stat label="Installed cost" value={`${ron(tot.cost)} RON`} />
            <Stat label="Payback" value={`${payback.toFixed(1)} years`} accent="text-battery" />
            <Stat label="ROI over 25 years" value={`${roi}%`} accent="text-solar" />
            <Stat label="Monthly net energy cost" value={`${ron((tot.pur + tot.m - tot.exp) / 12)} RON`} />
          </div>
        </div>

        <Panel title="Tariff assumptions">
          <div className="space-y-5">
            <SliderRow label="Retail price" unit="RON/kWh" value={retail} min={0.6} max={2} step={0.05} onChange={setRetail} />
            <SliderRow label="Export compensation" unit="RON/kWh" value={exportP} min={0} max={1} step={0.05} onChange={setExportP} />
            <SliderRow label="Maintenance" unit="% / year" value={maintPct} min={0} max={4} step={0.5} onChange={setMaintPct} />
          </div>
          <p className="mt-5 text-xs text-muted-foreground">Retail reflects a typical supplier contract, not the OPCOM day-ahead price.</p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel title="Cumulative cash flow · 25 years" className="lg:col-span-3" action={<span className="text-xs text-muted-foreground">Break-even in year <span className="num text-foreground">{Math.ceil(payback)}</span></span>}>
          <div className="h-72"><ResponsiveContainer>
            <AreaChart data={cashflow} margin={{ left: 10, right: 10 }}>
              <defs>
                <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={`${(cashflow[25].value / (cashflow[25].value - cashflow[0].value)) * 100}%`} stopColor="var(--solar)" stopOpacity={0.35} />
                  <stop offset={`${(cashflow[25].value / (cashflow[25].value - cashflow[0].value)) * 100}%`} stopColor="var(--destructive)" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" {...axis} tickFormatter={(v) => `Y${v}`} interval={4} />
              <YAxis {...axis} tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
              <Tooltip {...chartTooltip} formatter={(v: number) => [`${ron(v)} RON`, "Cumulative"]} labelFormatter={(l) => `Year ${l}`} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
              <ReferenceLine x={Math.ceil(payback)} stroke="var(--battery)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="value" stroke="var(--solar)" strokeWidth={2} fill="url(#cf)" />
            </AreaChart>
          </ResponsiveContainer></div>
        </Panel>

        <Panel title="Where the money goes · per year" className="lg:col-span-2">
          <div className="relative mx-auto h-48 w-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mix} dataKey="value" innerRadius={62} outerRadius={88} paddingAngle={2} stroke="none">
                  {mix.map((m) => <Cell key={m.name} fill={m.color} />)}
                </Pie>
                <Tooltip {...chartTooltip} formatter={(v: number) => `${ron(v)} RON`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div><p className="text-[11px] text-muted-foreground">Net / year</p><p className="num text-lg font-semibold">{ron(netAnnual)}</p></div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {mix.map((m) => (
              <div key={m.name} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.color }} />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{m.name}</span>
                <span className="num">{ron(m.value)}</span>
                <span className="num w-10 text-right text-xs text-muted-foreground">{Math.round((m.value / mixTotal) * 100)}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Top installations by annual value" className="mt-6">
        <div className="h-80"><ResponsiveContainer>
          <BarChart data={top} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis type="number" {...axis} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <YAxis type="category" dataKey="name" {...axis} width={130} />
            <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} formatter={(v: number) => `${ron(v)} RON`} />
            <Bar dataKey="self" name="Self-consumed" stackId="a" fill="var(--solar)" />
            <Bar dataKey="exp" name="Export" stackId="a" fill="var(--battery)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer></div>
      </Panel>

      <Panel title="Portfolio ranking" className="mt-6" action={rows.some((r) => r.lost > 0) ? <span className="text-xs text-muted-foreground">Lost to underperformance: <span className="num text-destructive">{ron(tot.lost)} RON/yr</span></span> : null}>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr>{["#", "Installation", "Cost", "Value / yr", "Return over 25y", "Payback", "Lost / yr"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.s.id} className="border-t border-border hover:bg-accent/40">
              <td className="num px-3 py-3 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-3">
                <Link to="/sites/$id" params={{ id: r.s.id }} className="flex items-center gap-3 hover:text-solar">
                  <img src={r.s.image} alt="" className="h-9 w-12 shrink-0 rounded-md object-cover" loading="lazy" />
                  <span className="min-w-0"><span className="block truncate font-medium">{r.s.name}</span><span className="text-xs text-muted-foreground">{r.s.kWp} kWp · {r.s.city}</span></span>
                </Link>
              </td>
              <td className="num px-3 py-3">{ron(r.s.installCostRON)}</td>
              <td className="num px-3 py-3 text-solar">{ron(r.annual)}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", r.roi > 0 ? "bg-solar" : "bg-destructive")} style={{ width: `${Math.max(3, (Math.max(0, r.roi) / maxRoi) * 100)}%` }} /></div>
                  <span className="num text-xs">{Math.round(r.roi)}%</span>
                </div>
              </td>
              <td className="px-3 py-3"><span className={cn("num rounded-md px-2 py-0.5 text-xs", !isFinite(r.payback) ? "bg-destructive/15 text-destructive" : r.payback < 7 ? "bg-solar/15 text-solar" : r.payback < 12 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive")}>{isFinite(r.payback) ? `${r.payback.toFixed(1)} y` : "never"}</span></td>
              <td className="num px-3 py-3 text-muted-foreground">{r.lost > 1 ? <span className="text-destructive">{ron(r.lost)}</span> : "—"}</td>
            </tr>))}</tbody>
        </table></div>
      </Panel>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className={cn("num mt-1 text-lg font-semibold", accent)}>{value}</p></div>;
}

function SliderRow({ label, unit, value, min, max, step, onChange }: { label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm"><span>{label}</span><span className="num">{value.toFixed(2)} <span className="text-xs text-muted-foreground">{unit}</span></span></div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
