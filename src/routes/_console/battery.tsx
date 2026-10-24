import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BatteryCharging, BatteryFull, BatteryLow, Timer, Zap, HeartPulse, Sun, Home, Pause, Play, Repeat, Thermometer } from "lucide-react";
import { BatteryGauge, PageHeader, Panel, Ring, axis, chartTooltip, fmt } from "@/components/solar/ui";
import { getSites, siteDay } from "@/lib/fleet";
import { estimateBattery, formatHours } from "@/lib/energy";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/battery")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Battery Intelligence — GridPulse" },
    { name: "description", content: "Battery state of charge, charging power and time-to-full estimates." },
    { property: "og:title", content: "Battery Intelligence — GridPulse" },
    { property: "og:description", content: "Battery state of charge and charging estimates." },
  ]}),
  component: BatteryPage,
});

function BatteryPage() {
  const sites = getSites().filter((s) => s.batteryKWh > 0);
  const [id, setId] = useState(sites[0].id);
  const site = sites.find((s) => s.id === id)!;
  const day = useMemo(() => siteDay(site), [site]);
  const [hour, setHour] = useState(11);
  const [live, setLive] = useState(true);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setHour((h) => (h >= 22 ? 6 : h + 1)), 4000);
    return () => clearInterval(t);
  }, [live]);
  const p = day[hour];
  const est = estimateBattery({ capacityKWh: site.batteryKWh, usableRatio: 0.9, soc: p.soc, chargeKW: p.batteryCharge, efficiency: 0.95 });
  const surplus = Math.max(0, p.solar - p.load);
  const charged = day.reduce((a, d) => a + Math.max(0, d.batteryCharge), 0);
  const discharged = day.reduce((a, d) => a + Math.max(0, -d.batteryCharge), 0);
  const cycles = charged / (site.batteryKWh * 0.9);
  const trend = day.map((d) => ({ label: d.label, soc: Math.round(d.soc * 100), power: d.batteryCharge }));
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const dd = siteDay(site, 6 - i);
    return { label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i], charged: +dd.reduce((a, x) => a + Math.max(0, x.batteryCharge), 0).toFixed(1), discharged: +dd.reduce((a, x) => a + Math.max(0, -x.batteryCharge), 0).toFixed(1) };
  });
  const stateInfo = est.state === "charging"
    ? { icon: BatteryCharging, text: "Charging from solar", cls: "text-battery bg-battery/10 border-battery/30" }
    : est.state === "discharging"
      ? { icon: BatteryLow, text: "Powering your home", cls: "text-warning bg-warning/10 border-warning/30" }
      : { icon: Pause, text: p.soc > 0.98 ? "Full · idle" : "Idle · not currently charging", cls: "text-muted-foreground bg-muted border-border" };

  return (
    <div>
      <PageHeader title="Battery intelligence" subtitle={`${site.batteryModel} · ${site.name}`}
        actions={<>
          <button onClick={() => setLive((x) => !x)} className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm hover:bg-accent">{live ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{live ? "Pause live" : "Resume live"}</button>
          <Select value={id} onValueChange={setId}><SelectTrigger className="w-60"><SelectValue /></SelectTrigger><SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.batteryKWh} kWh</SelectItem>)}</SelectContent></Select>
        </>} />

      {/* Hero */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="glass rounded-2xl p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", stateInfo.cls)}><stateInfo.icon className="h-3.5 w-3.5" />{stateInfo.text}</span>
            <span className="num text-xs text-muted-foreground">Simulated live · {p.label}</span>
          </div>
          <div className="mt-6 flex items-end gap-6">
            <p className="num text-6xl font-semibold">{Math.round(p.soc * 100)}<span className="text-2xl text-muted-foreground">%</span></p>
            <div className="pb-2 text-sm text-muted-foreground"><span className="num text-foreground">{fmt(est.storedKWh)}</span> of {fmt(est.usableKWh)} kWh usable</div>
          </div>
          <div className="mt-5"><BatteryGauge soc={p.soc} charging={est.state === "charging"} /></div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
            <Stat icon={Zap} label={est.state === "discharging" ? "Discharge power" : "Charge power"} value={`${fmt(Math.abs(p.batteryCharge), 2)} kW`} sub={`max ${site.batteryMaxChargeKW} kW`} />
            <Stat icon={Timer} label="Time to full" value={est.state === "charging" ? formatHours(est.hoursToFull) : "Not charging"} sub={est.state === "charging" ? `${fmt(surplus, 2)} kW solar surplus` : undefined} />
            <Stat icon={Timer} label="Time to empty" value={est.state === "discharging" ? formatHours(est.hoursToEmpty) : "—"} />
            <Stat icon={BatteryFull} label="Capacity" value={`${site.batteryKWh} kWh`} sub="90% usable" />
          </div>
        </div>

        <Panel title="Battery health">
          <div className="flex items-center gap-5">
            <Ring pct={97} size={96} color="var(--success)" sub="SoH" />
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-success" />Good condition</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Repeat className="h-4 w-4" /><span className="num text-foreground">412</span> lifetime cycles</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Thermometer className="h-4 w-4" /><span className="num text-foreground">24°C</span> cell temp.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Bar2 label="Charging efficiency" pct={95} color="bg-battery" />
            <Bar2 label="Capacity retained" pct={97} color="bg-success" />
            <Bar2 label="Used today" pct={Math.min(100, cycles * 100)} color="bg-warning" value={`${fmt(cycles, 2)} cycles`} />
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">Health values are estimates from the battery management system.</p>
        </Panel>
      </div>

      {/* Flow cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FlowCard icon={Sun} label="Solar now" value={`${fmt(p.solar, 2)} kW`} color="text-solar" pct={(p.solar / site.kWp) * 100} sub={`${Math.round((p.solar / site.kWp) * 100)}% of ${site.kWp} kWp`} barCls="bg-solar" />
        <FlowCard icon={Home} label="Home uses" value={`${fmt(p.load, 2)} kW`} color="text-warning" pct={Math.min(100, (p.load / Math.max(p.solar, p.load, 0.1)) * 100)} sub={p.solar >= p.load ? "Covered by solar" : "Needs battery or grid"} barCls="bg-warning" />
        <FlowCard icon={BatteryCharging} label="Charged / discharged today" value={`${fmt(charged)} / ${fmt(discharged)} kWh`} color="text-battery" pct={(charged / (site.batteryKWh * 0.9)) * 100} sub="Energy shifted to evening" barCls="bg-battery" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="State of charge today" className="xl:col-span-2" action={<span className="text-xs text-muted-foreground">Click the chart to jump to an hour</span>}>
          <div className="h-72"><ResponsiveContainer>
            <AreaChart data={trend} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) { setHour(Number(e.activeTooltipIndex)); setLive(false); } }}>
              <defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--battery)" stopOpacity={0.45} /><stop offset="1" stopColor="var(--battery)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axis} interval={2} /><YAxis {...axis} unit="%" domain={[0, 100]} />
              <Tooltip {...chartTooltip} />
              <ReferenceLine x={p.label} stroke="var(--foreground)" strokeDasharray="3 3" />
              <ReferenceLine y={10} stroke="var(--destructive)" strokeDasharray="4 4" label={{ value: "reserve", fill: "var(--muted-foreground)", fontSize: 10, position: "insideTopLeft" }} />
              <Area dataKey="soc" name="Charge %" stroke="var(--battery)" fill="url(#gb)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer></div>
        </Panel>
        <Panel title="Charge / discharge power">
          <div className="h-72"><ResponsiveContainer>
            <BarChart data={trend}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axis} interval={5} /><YAxis {...axis} unit=" kW" />
              <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="power" name="kW">{trend.map((d, i) => <Cell key={i} fill={d.power >= 0 ? "var(--battery)" : "var(--warning)"} opacity={i === hour ? 1 : 0.6} />)}</Bar>
            </BarChart>
          </ResponsiveContainer></div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-battery" />Charging</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warning" />Discharging</span></div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Last 7 days" className="xl:col-span-2">
          <div className="h-64"><ResponsiveContainer>
            <BarChart data={weekly}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axis} /><YAxis {...axis} unit=" kWh" />
              <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} />
              <Bar dataKey="charged" name="Charged" fill="var(--battery)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="discharged" name="Discharged" fill="var(--warning)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        </Panel>
        <Panel title="All batteries">
          <div className="space-y-2">
            {sites.slice(0, 7).map((s) => {
              const soc = siteDay(s)[hour].soc;
              return (
                <button key={s.id} onClick={() => setId(s.id)} className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors", s.id === id ? "bg-accent" : "hover:bg-accent/50")}>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm">{s.name}</p><p className="text-xs text-muted-foreground">{s.batteryKWh} kWh</p></div>
                  <div className="h-2 w-20 rounded-full bg-muted"><div className={cn("h-2 rounded-full", soc < 0.2 ? "bg-destructive" : soc < 0.4 ? "bg-warning" : "bg-battery")} style={{ width: `${soc * 100}%` }} /></div>
                  <span className="num w-10 text-right text-xs">{Math.round(soc * 100)}%</span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Solar panels produce electricity; they don't store it. Charging estimates refer to the battery, based on solar surplus, max charge power, remaining usable capacity and 95% efficiency.</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Sun; label: string; value: string; sub?: string }) {
  return <div><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p><p className="num mt-1 text-lg font-semibold">{value}</p>{sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}</div>;
}
function Bar2({ label, pct, color, value }: { label: string; pct: number; color: string; value?: string }) {
  return <div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="num">{value ?? `${Math.round(pct)}%`}</span></div><div className="h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full transition-all", color)} style={{ width: `${pct}%` }} /></div></div>;
}
function FlowCard({ icon: Icon, label, value, sub, color, pct, barCls }: { icon: typeof Sun; label: string; value: string; sub: string; color: string; pct: number; barCls: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className={cn("h-3.5 w-3.5", color)} />{label}</p>
      <p className="num mt-2 text-xl font-semibold">{value}</p>
      <div className="mt-3 h-1.5 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full transition-all duration-500", barCls)} style={{ width: `${Math.min(100, pct)}%` }} /></div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
