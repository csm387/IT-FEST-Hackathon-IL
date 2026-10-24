import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BatteryCharging, BatteryFull, Gauge, Timer, Activity, HeartPulse, Sun, Zap } from "lucide-react";
import { Kpi, PageHeader, Panel, axis, chartTooltip, fmt } from "@/components/solar/ui";
import { getSites, siteDay } from "@/lib/fleet";
import { estimateBattery, formatHours } from "@/lib/energy";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_console/battery")({
  head: () => ({ meta: [
    { title: "Battery Intelligence — SolarOps" },
    { name: "description", content: "Battery state of charge, charging power and time-to-full estimates." },
    { property: "og:title", content: "Battery Intelligence — SolarOps" },
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
  // Live drift: advance through the day every 6s
  useEffect(() => { const t = setInterval(() => setHour((h) => (h >= 20 ? 6 : h + 1)), 6000); return () => clearInterval(t); }, []);
  const p = day[hour];
  const est = estimateBattery({ capacityKWh: site.batteryKWh, usableRatio: 0.9, soc: p.soc, chargeKW: p.batteryCharge, efficiency: 0.95 });
  const surplus = Math.max(0, p.solar - p.load);
  const trend = day.map((d) => ({ label: d.label, soc: Math.round(d.soc * 100), power: d.batteryCharge }));

  return (
    <div>
      <PageHeader title="Battery intelligence" subtitle={`Simulated live at ${p.label} · updates as production and consumption change`}
        actions={<Select value={id} onValueChange={setId}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.batteryKWh} kWh</SelectItem>)}</SelectContent></Select>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={BatteryFull} label="Total capacity" value={site.batteryKWh} unit="kWh" tone="battery" hint={site.batteryModel ?? ""} />
        <Kpi icon={BatteryCharging} label="Usable capacity" value={fmt(est.usableKWh)} unit="kWh" tone="battery" hint="90% depth of discharge" />
        <Kpi icon={Gauge} label="Stored energy" value={fmt(est.storedKWh)} unit="kWh" tone="battery" hint={`${Math.round(p.soc * 100)}% state of charge`} />
        <Kpi icon={Activity} label={est.state === "discharging" ? "Discharging power" : "Charging power"} value={fmt(Math.abs(p.batteryCharge), 2)} unit="kW" tone="battery" hint={`Max ${site.batteryMaxChargeKW} kW`} />
        <Kpi icon={Timer} label="Time until full" value={est.state === "charging" ? formatHours(est.hoursToFull) : "Not currently charging"} tone="solar" hint={est.state === "charging" ? `Solar surplus ${fmt(surplus, 2)} kW` : undefined} />
        <Kpi icon={Timer} label="Time until empty" value={est.state === "discharging" ? formatHours(est.hoursToEmpty) : "—"} tone="warning" />
        <Kpi icon={Zap} label="Charging efficiency" value="95" unit="%" tone="battery" estimate />
        <Kpi icon={HeartPulse} label="Battery health" value="97" unit="% SoH" tone="solar" estimate />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="State of charge & power today" className="lg:col-span-2">
          <div className="h-72"><ResponsiveContainer>
            <AreaChart data={trend}>
              <defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--battery)" stopOpacity={0.5} /><stop offset="1" stopColor="var(--battery)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axis} interval={2} /><YAxis yAxisId="a" {...axis} unit="%" /><YAxis yAxisId="b" orientation="right" {...axis} unit=" kW" />
              <Tooltip {...chartTooltip} />
              <Area yAxisId="a" dataKey="soc" name="SoC %" stroke="var(--battery)" fill="url(#gb)" strokeWidth={2} />
              <Area yAxisId="b" dataKey="power" name="Power kW" stroke="var(--solar)" fill="none" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer></div>
        </Panel>
        <Panel title="PV capacity vs utilization">
          <div className="flex items-center gap-3"><Sun className="h-5 w-5 text-solar" /><div><p className="text-xs text-muted-foreground">Installed peak capacity</p><p className="num text-xl">{site.kWp} kWp</p></div></div>
          <div className="mt-4"><p className="text-xs text-muted-foreground">Current output</p><p className="num text-xl">{fmt(p.solar, 2)} kW</p></div>
          <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${Math.min(100, (p.solar / site.kWp) * 100)}%` }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">{Math.round((p.solar / site.kWp) * 100)}% of rated capacity</p>
          <p className="mt-6 rounded-xl border border-border p-3 text-xs text-muted-foreground">Solar panels produce electricity; they don't store it. Charging estimates refer to the battery, based on solar surplus, max charge power, remaining usable capacity and efficiency.</p>
        </Panel>
      </div>
    </div>
  );
}
