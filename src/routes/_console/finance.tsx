import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Wallet, Wrench, ArrowDownToLine, Sun, Coins, Receipt, TrendingUp, Hourglass, TrendingDown } from "lucide-react";
import { Kpi, PageHeader, Panel, axis, chartTooltip, ron } from "@/components/solar/ui";
import { getSites, siteDay, sumDay } from "@/lib/fleet";
import { paybackYears, roiPercent } from "@/lib/energy";

export const Route = createFileRoute("/_console/finance")({
  head: () => ({ meta: [
    { title: "Financial Tracking — SolarOps" },
    { name: "description", content: "Cost, savings, export revenue, ROI and payback per installation in RON." },
    { property: "og:title", content: "Financial Tracking — SolarOps" },
    { property: "og:description", content: "Cost, savings, ROI and payback per solar installation." },
  ]}),
  component: Finance,
});

const inp = "h-9 w-24 rounded-lg border border-border bg-background/40 px-2 text-sm num";

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

  return (
    <div>
      <PageHeader title="Financial tracking" subtitle="Annualised from measured (simulated) energy flows. All RON values below are estimates."
        actions={<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <label>Retail RON/kWh <input type="number" step="0.05" className={inp} value={retail} onChange={(e) => setRetail(+e.target.value)} /></label>
          <label>Export RON/kWh <input type="number" step="0.05" className={inp} value={exportP} onChange={(e) => setExportP(+e.target.value)} /></label>
          <label>Maint. %/yr <input type="number" step="0.5" className={inp} value={maintPct} onChange={(e) => setMaintPct(+e.target.value)} /></label>
        </div>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi icon={Wallet} label="Installation cost (portfolio)" value={ron(tot.cost)} unit="RON" tone="home" />
        <Kpi icon={Wrench} label="Maintenance / year" value={ron(tot.m)} unit="RON" tone="warning" estimate />
        <Kpi icon={ArrowDownToLine} label="Electricity purchases / year" value={ron(tot.pur)} unit="RON" tone="grid" estimate />
        <Kpi icon={Sun} label="Self-consumed value / year" value={ron(tot.self)} unit="RON" estimate />
        <Kpi icon={Coins} label="Export credits / year" value={ron(tot.exp)} unit="RON" tone="battery" estimate />
        <Kpi icon={Receipt} label="Monthly net energy cost" value={ron((tot.pur + tot.m - tot.exp) / 12)} unit="RON" tone="grid" estimate />
        <Kpi icon={TrendingUp} label="Lifetime savings (25y)" value={ron((tot.annual - tot.m) * 25)} unit="RON" estimate />
        <Kpi icon={TrendingUp} label="Portfolio ROI" value={Math.round(roiPercent(tot.cost, (tot.annual - tot.m) * 25))} unit="%" estimate />
        <Kpi icon={Hourglass} label="Average payback" value={(tot.cost / (tot.annual - tot.m)).toFixed(1)} unit="years" tone="battery" estimate />
        <Kpi icon={TrendingDown} label="Lost to underperformance / yr" value={ron(tot.lost)} unit="RON" tone="destructive" estimate />
      </div>
      <Panel title="Top 10 by annual value" className="mt-6">
        <div className="h-72"><ResponsiveContainer><BarChart data={rows.slice(0, 10).map((r) => ({ name: r.s.name, "Self-consumption": Math.round(r.selfValue), Export: Math.round(r.exportRev), Lost: Math.round(r.lost) }))}>
          <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} interval={0} angle={-15} height={50} /><YAxis {...axis} />
          <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} /><Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Self-consumption" stackId="a" fill="var(--solar)" /><Bar dataKey="Export" stackId="a" fill="var(--battery)" /><Bar dataKey="Lost" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
        </BarChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Portfolio ranking" className="mt-6">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr>{["#", "Site", "Cost", "Annual value", "Maint.", "Net cost/yr", "ROI 25y", "Payback", "Lost/yr"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.s.id} className="border-t border-border hover:bg-accent/40">
              <td className="px-3 py-2 num text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2"><Link to="/sites/$id" params={{ id: r.s.id }} className="hover:text-solar">{r.s.name}</Link></td>
              <td className="px-3 py-2 num">{ron(r.s.installCostRON)}</td><td className="px-3 py-2 num text-solar">{ron(r.annual)}</td>
              <td className="px-3 py-2 num">{ron(r.maint)}</td><td className="px-3 py-2 num">{ron(r.net)}</td>
              <td className="px-3 py-2 num">{Math.round(r.roi)}%</td><td className="px-3 py-2 num">{isFinite(r.payback) ? `${r.payback.toFixed(1)} y` : "—"}</td>
              <td className="px-3 py-2 num text-destructive">{ron(r.lost)}</td>
            </tr>))}</tbody>
        </table></div>
        <p className="mt-3 text-xs text-muted-foreground">Retail tariff reflects a typical supplier contract, not the OPCOM day-ahead price. Values are estimates for information only.</p>
      </Panel>
    </div>
  );
}
