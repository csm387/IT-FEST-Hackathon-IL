import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sun, Zap, Home, BatteryCharging, ArrowDownToLine, ArrowUpFromLine, PiggyBank, Coins, Recycle, Gauge, Server, AlertTriangle } from "lucide-react";
import { Kpi, PageHeader, Panel, Segmented, axis, chartTooltip, fmt, ron } from "@/components/solar/ui";
import { EnergyFlow } from "@/components/solar/EnergyFlow";
import { aggregatePeriod, getSites, homeSite, siteDay, sumDay, TARIFF, yearly, buildAlerts } from "@/lib/fleet";
import { computeFlows } from "@/lib/energy";

export const Route = createFileRoute("/_console/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — SolarOps" },
    { name: "description", content: "Live solar production, consumption, battery and grid exchange with savings in RON." },
    { property: "og:title", content: "Dashboard — SolarOps" },
    { property: "og:description", content: "Live solar production, consumption, battery and grid exchange." },
  ]}),
  component: Dashboard,
});

type Period = "today" | "7d" | "30d" | "year" | "custom";

function Dashboard() {
  const site = homeSite();
  const [period, setPeriod] = useState<Period>("today");
  const [customDays, setCustomDays] = useState(14);
  const today = useMemo(() => siteDay(site), [site]);
  const t = sumDay(today);
  const hourNow = 13;
  const now = today[hourNow];
  const flows = computeFlows({ solarKW: now.solar, loadKW: now.load, soc: now.soc, maxChargeKW: site.batteryMaxChargeKW, hasBattery: site.batteryKWh > 0 });
  const selfUsed = t.solar - t.export;
  const sites = getSites();
  const alerts = buildAlerts().filter((a) => a.status !== "Resolved");

  const data = useMemo(() => {
    if (period === "today") return today.map((p) => ({ label: p.label, solar: p.solar, load: p.load, import: p.gridImport, export: p.gridExport, charged: Math.max(0, p.batteryCharge) }));
    if (period === "year") return yearly(site);
    return aggregatePeriod(site, period === "7d" ? 7 : period === "30d" ? 30 : customDays);
  }, [period, customDays, today, site]);
  const unit = period === "today" ? "kW" : "kWh";

  return (
    <div>
      <PageHeader title="Good afternoon, Andrei" subtitle={`${site.name} · ${site.kWp} kWp · ${site.batteryKWh} kWh battery`}
        actions={<>
          <Segmented<Period> value={period} onChange={setPeriod} options={[{ value: "today", label: "Today" }, { value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "year", label: "This year" }, { value: "custom", label: "Custom" }]} />
          {period === "custom" && <label className="flex items-center gap-2 text-xs text-muted-foreground">Last <input type="number" min={2} max={60} value={customDays} onChange={(e) => setCustomDays(Math.min(60, Math.max(2, +e.target.value)))} className="w-16 rounded-lg border border-border bg-background/40 px-2 py-1 text-foreground" /> days</label>}
        </>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Kpi icon={Sun} label="Produced today" value={fmt(t.solar)} unit="kWh" />
        <Kpi icon={Zap} label="Current production" value={fmt(now.solar, 2)} unit="kW" />
        <Kpi icon={Home} label="Consumed today" value={fmt(t.load)} unit="kWh" tone="home" />
        <Kpi icon={BatteryCharging} label="Battery charge" value={Math.round(now.soc * 100)} unit="%" tone="battery" />
        <Kpi icon={ArrowDownToLine} label="Imported from grid" value={fmt(t.import)} unit="kWh" tone="grid" />
        <Kpi icon={ArrowUpFromLine} label="Exported to grid" value={fmt(t.export)} unit="kWh" tone="grid" />
        <Kpi icon={PiggyBank} label="Estimated savings" value={ron(selfUsed * TARIFF.retailRON)} unit="RON" estimate />
        <Kpi icon={Coins} label="Export revenue" value={ron(t.export * TARIFF.exportRON)} unit="RON" estimate tone="battery" />
        <Kpi icon={Recycle} label="Self-consumption" value={Math.round((selfUsed / t.solar) * 100)} unit="%" />
        <Kpi icon={Gauge} label="Self-sufficiency" value={Math.round(((t.load - t.import) / t.load) * 100)} unit="%" tone="battery" />
        <Kpi icon={Server} label="Installations online" value={`${sites.filter((s) => s.status !== "offline").length}/${sites.length}`} tone="home" />
        <Kpi icon={AlertTriangle} label="Active anomalies" value={alerts.length} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title={`Energy overview (${unit})`} className="xl:col-span-2">
          <div className="h-80">
            <ResponsiveContainer>
              {period === "today" ? (
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--solar)" stopOpacity={0.5} /><stop offset="1" stopColor="var(--solar)" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--home)" stopOpacity={0.25} /><stop offset="1" stopColor="var(--home)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axis} interval={2} /><YAxis {...axis} />
                  <Tooltip {...chartTooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="solar" name="Solar" stroke="var(--solar)" fill="url(#gs)" strokeWidth={2} />
                  <Area type="monotone" dataKey="load" name="Consumption" stroke="var(--home)" fill="url(#gl)" strokeWidth={2} />
                  <Area type="monotone" dataKey="charged" name="Battery charging" stroke="var(--battery)" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="import" name="Grid import" stroke="var(--grid)" fill="none" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="export" name="Grid export" stroke="var(--warning)" fill="none" strokeDasharray="4 4" />
                </AreaChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axis} /><YAxis {...axis} />
                  <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="solar" name="Solar" fill="var(--solar)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="load" name="Consumption" fill="var(--home)" radius={[6, 6, 0, 0]} opacity={0.7} />
                  <Bar dataKey="import" name="Grid import" fill="var(--grid)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="export" name="Grid export" fill="var(--battery)" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Live energy flow · 13:00">
          <div className="h-80"><EnergyFlow flows={flows} solarKW={now.solar} loadKW={now.load} soc={now.soc} hasBattery={site.batteryKWh > 0} /></div>
        </Panel>
      </div>
    </div>
  );
}
