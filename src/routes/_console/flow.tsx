import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Sun, Moon, CloudSun, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnergySankey, sankeyFromDay } from "@/components/solar/EnergySankey";
import { PageHeader, Panel, fmt } from "@/components/solar/ui";
import { homeSite, siteDay } from "@/lib/fleet";
import { computeFlows } from "@/lib/energy";

export const Route = createFileRoute("/_console/flow")({
  head: () => ({ meta: [
    { title: "Live Energy Flow — SolarOps" },
    { name: "description", content: "Animated energy flow between solar panels, home, battery and grid." },
    { property: "og:title", content: "Live Energy Flow — SolarOps" },
    { property: "og:description", content: "Animated energy flow between solar, home, battery and grid." },
  ]}),
  component: FlowPage,
});

function FlowPage() {
  const site = homeSite();
  const day = useMemo(() => siteDay(site), [site]);
  const [hour, setHour] = useState(13);
  const p = day[hour];
  const prevSoc = hour > 0 ? day[hour - 1].soc : 0.35;
  const f = computeFlows({ solarKW: p.solar, loadKW: p.load, soc: prevSoc, maxChargeKW: site.batteryMaxChargeKW, hasBattery: site.batteryKWh > 0 });
  const supply = f.solarToHome + f.batteryToHome + f.gridToHome;
  const solarUse = f.solarToHome + f.solarToBattery + f.solarToGrid;
  const maxKW = Math.max(...day.map((d) => Math.max(d.solar, d.load)), 0.1);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setHour((h) => (h >= 23 ? 0 : h + 1)), 900);
    return () => clearInterval(t);
  }, [playing]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setHour((h) => Math.min(23, h + 1));
      if (e.key === "ArrowLeft") setHour((h) => Math.max(0, h - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const phase = p.solar < 0.05 ? { icon: Moon, label: "Night: home runs on battery and grid" } : p.solar > p.load ? { icon: Sun, label: f.solarToBattery > 0.01 ? "Solar surplus: charging the battery" : "Solar surplus: battery full, exporting to grid" } : { icon: CloudSun, label: "Solar covers part of the home" };
  const homeMix = [
    { l: "Solar", v: f.solarToHome, c: "bg-solar" },
    { l: "Battery", v: f.batteryToHome, c: "bg-battery" },
    { l: "Grid", v: f.gridToHome, c: "bg-grid" },
  ];
  const solarMix = [
    { l: "Home", v: f.solarToHome, c: "bg-solar" },
    { l: "Battery", v: f.solarToBattery, c: "bg-battery" },
    { l: "Export", v: f.solarToGrid, c: "bg-grid" },
  ];
  const selfPct = supply > 0 ? Math.round(((f.solarToHome + f.batteryToHome) / supply) * 100) : 0;

  return (
    <div>
      <PageHeader title="Live energy flow" subtitle="Where today's energy came from and where it went. Usage split is estimated until sub-meters are connected." />
      <Panel title="Today, sources to usage" className="mb-6"><EnergySankey data={sankeyFromDay(day)} /></Panel>
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3" title="Hour by hour"
          action={<div className="flex items-center gap-1">
            <button aria-label="Previous hour" onClick={() => setHour((h) => Math.max(0, h - 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <button aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying((x) => !x)} className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? "Pause" : "Play day"}</button>
            <button aria-label="Next hour" onClick={() => setHour((h) => Math.min(23, h + 1))} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="num text-4xl font-semibold">{p.label}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><phase.icon className="h-4 w-4" />{phase.label}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-right">
              <div><p className="text-xs text-muted-foreground">Solar</p><p className="num whitespace-nowrap text-lg text-solar">{fmt(p.solar, 2)}<span className="text-xs text-muted-foreground"> kW</span></p></div>
              <div><p className="text-xs text-muted-foreground">Home</p><p className="num whitespace-nowrap text-lg">{fmt(p.load, 2)}<span className="text-xs text-muted-foreground"> kW</span></p></div>
              <div><p className="text-xs text-muted-foreground">Battery</p><p className="num text-lg text-battery">{Math.round(p.soc * 100)}%</p></div>
            </div>
          </div>

          {/* Clickable 24h chart */}
          <div className="mt-6 flex h-40 items-end gap-1" role="group" aria-label="Select hour">
            {day.map((d, h) => {
              const active = h === hour;
              return (
                <button key={h} onClick={() => { setHour(h); setPlaying(false); }} aria-label={`${d.label}: solar ${d.solar} kW, home ${d.load} kW`} aria-pressed={active}
                  className={cn("group relative flex h-full flex-1 items-end justify-center rounded-md transition-colors", active ? "bg-accent" : "hover:bg-accent/50")}>
                  <span className={cn("w-[45%] rounded-t-sm transition-all", active ? "bg-solar" : "bg-solar/40 group-hover:bg-solar/70")} style={{ height: `${(d.solar / maxKW) * 92}%` }} />
                  <span className={cn("w-[45%] rounded-t-sm transition-all", active ? "bg-warning" : "bg-warning/30 group-hover:bg-warning/60")} style={{ height: `${(d.load / maxKW) * 92}%` }} />
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-battery" style={{ opacity: d.soc }} />
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1">
            {day.map((d, h) => <span key={h} className={cn("num flex-1 text-center text-[10px]", h === hour ? "font-semibold text-foreground" : "text-muted-foreground")}>{h % 3 === 0 || h === hour ? h : ""}</span>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-solar" />Solar production</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warning" />Home consumption</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-battery" />Battery level</span>
            <span className="ml-auto">Tip: use ← → keys</span>
          </div>
        </Panel>

        <Panel title="Energy balance" className="lg:col-span-2" action={Math.abs(supply - p.load) < 0.01 ? <span className="flex items-center gap-1 text-xs text-solar"><Check className="h-3.5 w-3.5" />Balanced</span> : null}>
          <MixBar title="Home supplied by" total={supply} items={homeMix} />
          <div className="mt-5"><MixBar title="Solar sent to" total={solarUse} items={solarMix} /></div>

          <div className="mt-6 flex items-center gap-4 rounded-xl border border-border p-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="4" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--solar)" strokeWidth="4" strokeDasharray={`${selfPct} 100`} strokeLinecap="round" className="transition-all duration-500" />
              </svg>
              <span className="num absolute inset-0 grid place-items-center text-sm font-semibold">{selfPct}%</span>
            </div>
            <div>
              <p className="text-sm font-medium">Self-powered</p>
              <p className="text-xs text-muted-foreground">Share of home use covered by your own solar and battery at {p.label}.</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Battery ↔ grid exchange is disabled for this installation (not supported by contract).</p>
        </Panel>
      </div>
    </div>
  );
}

function MixBar({ title, total, items }: { title: string; total: number; items: { l: string; v: number; c: string }[] }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm"><span className="font-medium">{title}</span><span className="num text-muted-foreground">{fmt(total, 2)} kW</span></div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {items.map((it) => <span key={it.l} className={cn("h-full transition-all duration-500", it.c)} style={{ width: total > 0 ? `${(it.v / total) * 100}%` : "0%" }} />)}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.l} className={cn("rounded-lg bg-background/40 px-2 py-1.5", it.v < 0.01 && "opacity-40")}>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={cn("h-2 w-2 rounded-full", it.c)} />{it.l}</p>
            <p className="num text-sm">{fmt(it.v, 2)}<span className="text-[10px] text-muted-foreground"> kW</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}
