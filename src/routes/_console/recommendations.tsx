import { useSavedSetting } from '@/hooks/use-saved-setting';
import { useWorkspace } from '@/components/solar/WorkspaceProvider';
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { WashingMachine, Flame, Heater, AirVent, Car, Plus, Sun, BatteryCharging, CloudSun, Clock } from "lucide-react";
import { PageHeader, Panel, fmt } from "@/components/solar/ui";
import { homeSite, retailAt, siteDay, TARIFF } from "@/lib/fleet";
import { classifyHour, type Slot } from "@/lib/energy";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/recommendations")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Smart Recommendations — GridPulse" },
    { name: "description", content: "When to run appliances to use the most solar energy and pay the least." },
    { property: "og:title", content: "Smart Recommendations — GridPulse" },
    { property: "og:description", content: "When to run appliances to maximise solar self-consumption." },
  ]}),
  component: Recs,
});

const slotStyle: Record<Slot, string> = { best: "bg-solar", moderate: "bg-warning", expensive: "bg-destructive" };
const defaultLoads = [
  { id: "wm", name: "Washing machine", kw: 2, hours: 2, icon: WashingMachine, on: true },
  { id: "wh", name: "Water heater", kw: 2.4, hours: 2, icon: Flame, on: true },
  { id: "hp", name: "Heat pump", kw: 3, hours: 4, icon: Heater, on: false },
  { id: "ac", name: "Air conditioning", kw: 1.5, hours: 3, icon: AirVent, on: false },
  { id: "ev", name: "EV charger", kw: 7.4, hours: 3, icon: Car, on: true },
];

function bestWindow(surplus: number[], hours: number) {
  let best = 0, at = 10;
  for (let h = 6; h <= 20 - hours; h++) { const s = surplus.slice(h, h + hours).reduce((a, b) => a + b, 0); if (s > best) { best = s; at = h; } }
  return { at, avg: best / hours };
}

function Recs() {
  const { home: site } = useWorkspace();
  const day = useMemo(() => siteDay(site), [site]);
  const [savedLoads, saveLoads] = useSavedSetting(Route.useRouteContext().account.userId, "loads", defaultLoads.map(({ icon, ...load }) => load));
  const loads = savedLoads.map(load => ({ ...load, icon: defaultLoads.find(l => l.id === load.id)?.icon ?? Plus }));
  const setLoads = (values: typeof loads) => saveLoads(values.map(({ icon, ...load }) => load));
  const surplus = day.map((p) => Math.max(0, p.solar - p.load));
  const slots = day.map((p, h) => classifyHour(surplus[h], retailAt(h), TARIFF.peakRetailRON));
  const peak = day.reduce((a, b) => (b.solar > a.solar ? b : a));
  const nowH = 11;
  const recs = [
    { icon: Sun, title: `Expected ${fmt(peak.solar)} kW at ${peak.label}`, body: `Consider running your washing machine between ${String(peak.hour - 1).padStart(2, "0")}:00 and ${String(peak.hour + 2).padStart(2, "0")}:00.`, tag: "Forecast" },
    { icon: BatteryCharging, title: "Battery fills by early afternoon", body: `Battery reaches ~${Math.round(day[14].soc * 100)}% at 14:00 with production still high. Good time to charge your EV.`, tag: "Forecast" },
    { icon: CloudSun, title: "Clouds later this afternoon", body: "Shift flexible consumption into the next two hours while surplus is available.", tag: "Weather" },
    { icon: Clock, title: "Evening tariff is higher", body: `Your contract charges ${TARIFF.peakRetailRON} RON/kWh from 17:00–22:00 vs ${TARIFF.retailRON} by day. Use solar earlier; exporting earns only ${TARIFF.exportRON} RON/kWh.`, tag: "Tariff" },
  ];
  return (
    <div>
      <PageHeader title="Smart consumption" subtitle={`Based on your contract (${TARIFF.retailRON} RON/kWh day, ${TARIFF.peakRetailRON} peak) and quantity compensation — not wholesale prices alone.`} />
      <Panel title="24-hour optimization timeline">
        <div className="flex gap-1">
          {slots.map((s, h) => (
            <div key={h} className="group relative flex-1">
              <div className={cn("h-14 rounded-md opacity-80 transition group-hover:opacity-100", slotStyle[s], h === nowH && "ring-2 ring-foreground")} style={{ opacity: 0.35 + Math.min(0.65, surplus[h] / 4) }} />
              <p className="num mt-1 text-center text-[9px] text-muted-foreground">{h}</p>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-36 -translate-x-1/2 rounded-lg border border-border bg-popover p-2 text-xs group-hover:block">
                {day[h].label}: {fmt(surplus[h], 2)} kW surplus · {retailAt(h)} RON/kWh
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-solar" />Best time</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-warning" />Moderate</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-destructive" />Expensive</span>
        </div>
      </Panel>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {recs.map((r) => (
          <div key={r.title} className="glass flex gap-4 rounded-2xl p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-solar/10 text-solar"><r.icon className="h-5 w-5" /></span>
            <div><div className="flex items-center gap-2"><h3 className="font-semibold">{r.title}</h3><span className="rounded-full border border-border px-2 text-[10px] text-muted-foreground">{r.tag}</span></div><p className="mt-1 text-sm text-muted-foreground">{r.body}</p></div>
          </div>
        ))}
      </div>
      <Panel className="mt-6" title="Flexible loads" action={<button onClick={() => setLoads([...loads, { id: crypto.randomUUID(), name: "Custom load", kw: 1, hours: 1, icon: Plus, on: true }])} className="flex items-center gap-1 text-xs text-solar"><Plus className="h-3 w-3" />Add load</button>}>
        <div className="space-y-2">
          {loads.map((l, i) => {
            const w = bestWindow(surplus, l.hours);
            const covered = Math.min(1, w.avg / l.kw);
            const saved = l.kw * l.hours * covered * (TARIFF.peakRetailRON - 0);
            return (
              <div key={l.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl bg-background/40 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
                <l.icon className="h-5 w-5 text-battery" />
                <div className="min-w-0"><p className="truncate text-sm font-medium">{l.name}</p><p className="text-xs text-muted-foreground">{l.kw} kW · {l.hours}h</p></div>
                <p className="hidden text-right text-xs sm:block">{l.on ? <>Run <span className="num text-solar">{String(w.at).padStart(2, "0")}:00–{String(w.at + l.hours).padStart(2, "0")}:00</span><br /><span className="text-muted-foreground">{Math.round(covered * 100)}% solar · saves ≈{fmt(saved, 0)} RON vs evening</span></> : <span className="text-muted-foreground">Paused</span>}</p>
                <Switch checked={l.on} onCheckedChange={(v) => setLoads(loads.map((x, j) => (j === i ? { ...x, on: v } : x)))} />
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
