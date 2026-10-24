import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sun, Home, BatteryCharging, ArrowDownToLine, ArrowUpFromLine, PiggyBank, Server, AlertTriangle, Cloud, Thermometer, Wind, Lightbulb, ArrowRight, Leaf, Coins } from "lucide-react";
import { PageHeader, Panel, Ring, Segmented, SeverityChip, StatusBadge, axis, chartTooltip, fmt, ron } from "@/components/solar/ui";
import { EnergySankey, sankeyFromDay } from "@/components/solar/EnergySankey";
import { aggregatePeriod, getSites, homeSite, siteDay, sumDay, TARIFF, yearly, buildAlerts, healthScore } from "@/lib/fleet";
import { weatherLabel, weatherQuery } from "@/lib/weather";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/dashboard")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Dashboard — GridPulse" },
    { name: "description", content: "Live solar production, consumption, battery and grid exchange with savings in RON." },
    { property: "og:title", content: "Dashboard — GridPulse" },
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
  const now = today[13];
  const selfUsed = t.solar - t.export;
  const sites = getSites();
  const alerts = buildAlerts().filter((a) => a.status !== "Resolved");
  const { data: w } = useQuery(weatherQuery(site.lat, site.lng));
  const savings = selfUsed * TARIFF.retailRON;
  const exportRev = t.export * TARIFF.exportRON;
  const selfCons = Math.round((selfUsed / t.solar) * 100);
  const selfSuff = Math.round(((t.load - t.import) / t.load) * 100);
  const co2 = t.solar * 0.29; // kg CO2 avoided (RO grid avg ~290 g/kWh)
  const peak = today.reduce((a, b) => (b.solar > a.solar ? b : a));
  const online = sites.filter((s) => s.status !== "offline").length;

  const data = useMemo(() => {
    if (period === "today") return today.map((p) => ({ label: p.label, solar: p.solar, load: p.load, import: p.gridImport, export: p.gridExport, charged: Math.max(0, p.batteryCharge) }));
    if (period === "year") return yearly(site);
    return aggregatePeriod(site, period === "7d" ? 7 : period === "30d" ? 30 : customDays);
  }, [period, customDays, today, site]);
  const unit = period === "today" ? "kW" : "kWh";

  return (
    <div>
      <PageHeader title="Good afternoon, Andrei" subtitle="Saturday, 24 October · 13:00" />

      {/* Hero */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass relative overflow-hidden rounded-2xl xl:col-span-2">
          <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
            <div className="p-6">
              <div className="flex items-center gap-2"><StatusBadge status={site.status} /><span className="text-xs text-muted-foreground">{site.name} · {site.city}</span></div>
              <p className="mt-5 text-sm text-muted-foreground">Producing right now</p>
              <p className="num text-5xl font-semibold text-solar">{fmt(now.solar, 2)}<span className="ml-2 text-lg font-normal text-muted-foreground">kW</span></p>
              <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-solar transition-all" style={{ width: `${(now.solar / site.kWp) * 100}%` }} /></div>
              <p className="mt-1.5 text-xs text-muted-foreground">{Math.round((now.solar / site.kWp) * 100)}% of {site.kWp} kWp · peak today {fmt(peak.solar)} kW at {peak.label}</p>
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5">
                <Mini icon={Home} label="Home uses" value={`${fmt(now.load, 2)} kW`} />
                <Mini icon={BatteryCharging} label="Battery" value={`${Math.round(now.soc * 100)}%`} tone="text-battery" />
                <Mini icon={now.gridExport > 0 ? ArrowUpFromLine : ArrowDownToLine} label={now.gridExport > 0 ? "Exporting" : "Importing"} value={`${fmt(now.gridExport || now.gridImport, 2)} kW`} tone="text-grid" />
              </div>
            </div>
            <div className="relative hidden md:block">
              <img src={site.image} alt={`${site.name} solar installation`} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-x-3 bottom-3 rounded-xl border border-border bg-background/90 p-3 text-xs">
                {w ? <>
                  <p className="flex items-center gap-1.5 font-medium"><Cloud className="h-3.5 w-3.5" />{weatherLabel(w.current.weather_code)}</p>
                  <div className="mt-1.5 flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" />{Math.round(w.current.temperature_2m)}°C</span>
                    <span>{w.current.cloud_cover}% cloud</span>
                    <span className="flex items-center gap-1"><Wind className="h-3 w-3" />{Math.round(w.current.wind_speed_10m)}</span>
                  </div>
                </> : <Skeleton className="h-9" />}
              </div>
            </div>
          </div>
        </div>

        <Panel title="Today's performance">
          <div className="grid grid-cols-2 gap-4">
            <RingStat pct={Math.min(100, (t.solar / t.expected) * 100)} label="Of expected" color="var(--solar)" />
            <RingStat pct={selfCons} label="Self-consumption" color="var(--battery)" />
            <RingStat pct={selfSuff} label="Self-sufficiency" color="var(--warning)" />
            <RingStat pct={healthScore(site)} label="System health" color="var(--success)" />
          </div>
        </Panel>
      </div>

      {/* KPI strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={Sun} label="Produced" value={fmt(t.solar)} unit="kWh" color="text-solar" />
        <Tile icon={Home} label="Consumed" value={fmt(t.load)} unit="kWh" />
        <Tile icon={ArrowDownToLine} label="Grid import" value={fmt(t.import)} unit="kWh" color="text-grid" />
        <Tile icon={ArrowUpFromLine} label="Grid export" value={fmt(t.export)} unit="kWh" color="text-grid" />
        <Tile icon={PiggyBank} label="Saved" value={ron(savings)} unit="RON" color="text-solar" est />
        <Tile icon={Coins} label="Export revenue" value={ron(exportRev)} unit="RON" color="text-battery" est />
      </div>

      <Panel title="Energy flow · today" className="mt-6"><EnergySankey data={sankeyFromDay(today)} /></Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title={`Energy overview (${unit})`} className="xl:col-span-2"
          action={<Segmented<Period> value={period} onChange={setPeriod} options={[{ value: "today", label: "Today" }, { value: "7d", label: "7d" }, { value: "30d", label: "30d" }, { value: "year", label: "Year" }, { value: "custom", label: "Custom" }]} />}>
          {period === "custom" && <label className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">Last <input type="number" min={2} max={60} value={customDays} onChange={(e) => setCustomDays(Math.min(60, Math.max(2, +e.target.value)))} className="w-16 rounded-lg border border-border bg-background/40 px-2 py-1 text-foreground" /> days</label>}
          <div className="h-80">
            <ResponsiveContainer>
              {period === "today" ? (
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--solar)" stopOpacity={0.4} /><stop offset="1" stopColor="var(--solar)" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--warning)" stopOpacity={0.25} /><stop offset="1" stopColor="var(--warning)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axis} interval={2} /><YAxis {...axis} />
                  <Tooltip {...chartTooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="solar" name="Solar" stroke="var(--solar)" fill="url(#gs)" strokeWidth={2} />
                  <Area type="monotone" dataKey="load" name="Consumption" stroke="var(--warning)" fill="url(#gl)" strokeWidth={2} />
                  <Area type="monotone" dataKey="charged" name="Battery charging" stroke="var(--battery)" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="import" name="Grid import" stroke="var(--grid)" fill="none" strokeDasharray="4 4" />
                </AreaChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" {...axis} /><YAxis {...axis} />
                  <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="solar" name="Solar" fill="var(--solar)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="load" name="Consumption" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="import" name="Grid import" fill="var(--grid)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="export" name="Grid export" fill="var(--battery)" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="space-y-6">
          <div className="rounded-2xl border border-solar/30 bg-solar/10 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-solar"><Lightbulb className="h-4 w-4" />Best time to use energy</p>
            <p className="mt-2 text-sm">You have about <span className="num font-semibold">{fmt(Math.max(0, now.solar - now.load), 1)} kW</span> of solar surplus right now. Start the washing machine or charge the EV before 15:00.</p>
            <Link to="/recommendations" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-solar hover:underline">See all recommendations<ArrowRight className="h-3 w-3" /></Link>
          </div>
          <Panel title="Environmental impact">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-success/10 text-success"><Leaf className="h-6 w-6" /></span>
              <div><p className="num text-2xl font-semibold">{fmt(co2)} <span className="text-sm font-normal text-muted-foreground">kg CO₂</span></p><p className="text-xs text-muted-foreground">avoided today · ≈ {Math.round(co2 / 0.06)} km not driven</p></div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Fleet status" action={<Link to="/business/dispatch" className="text-xs text-solar hover:underline">Open dispatch</Link>}>
          <div className="mb-4 flex items-center gap-4">
            <Ring pct={(online / sites.length) * 100} size={64} color="var(--success)" />
            <div><p className="text-sm"><span className="num font-semibold">{online}</span> of {sites.length} installations online</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Server className="h-3 w-3" />{sites.length - online} offline need attention</p></div>
          </div>
          <div className="space-y-2">
            {[...sites].sort((a, b) => healthScore(b) - healthScore(a)).slice(0, 4).map((s) => (
              <Link key={s.id} to="/sites/$id" params={{ id: s.id }} className="flex items-center gap-3 rounded-xl bg-background/40 p-2 hover:bg-accent">
                <img src={s.image} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.kWp} kWp · {s.city}</p></div>
                <span className="num text-sm text-solar">{healthScore(s)}</span>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Active anomalies · {alerts.length}</span>} action={<Link to="/operations" className="text-xs text-solar hover:underline">View all</Link>}>
          <div className="space-y-2">
            {alerts.slice(0, 6).map((a) => (
              <Link key={a.id} to="/sites/$id" params={{ id: a.siteId }} className="flex items-center gap-3 rounded-xl bg-background/40 px-3 py-2.5 hover:bg-accent">
                <span className={cn("h-8 w-1 shrink-0 rounded-full", a.severity === "Critical" || a.severity === "High" ? "bg-destructive" : a.severity === "Medium" ? "bg-warning" : "bg-muted-foreground")} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.type}</p><p className="truncate text-xs text-muted-foreground">{a.siteName} · {a.detected}</p></div>
                <span className="num hidden text-xs text-destructive sm:block">−{ron(a.lostRON)} RON</span>
                <SeverityChip level={a.severity} />
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Mini({ icon: Icon, label, value, tone }: { icon: typeof Sun; label: string; value: string; tone?: string }) {
  return <div><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p><p className={cn("num mt-1 text-lg font-semibold", tone)}>{value}</p></div>;
}
function RingStat({ pct, label, color }: { pct: number; label: string; color: string }) {
  return <div className="flex flex-col items-center gap-2 rounded-xl bg-background/40 p-3"><Ring pct={pct} color={color} size={76} /><p className="text-center text-xs text-muted-foreground">{label}</p></div>;
}
function Tile({ icon: Icon, label, value, unit, color, est }: { icon: typeof Sun; label: string; value: string; unit: string; color?: string; est?: boolean }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Icon className={cn("h-3.5 w-3.5", color)} />{label}</span>{est && <span className="text-[9px] uppercase tracking-wider">est.</span>}</p>
      <p className="num mt-2 text-xl font-semibold">{value}<span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span></p>
    </div>
  );
}
