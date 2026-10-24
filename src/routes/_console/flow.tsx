import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EnergyFlow } from "@/components/solar/EnergyFlow";
import { PageHeader, Panel, fmt } from "@/components/solar/ui";
import { homeSite, siteDay } from "@/lib/fleet";
import { computeFlows } from "@/lib/energy";
import { Slider } from "@/components/ui/slider";

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
  const rows = [
    ["Solar → Home", f.solarToHome, "text-solar"], ["Solar → Battery", f.solarToBattery, "text-solar"], ["Solar → Grid", f.solarToGrid, "text-solar"],
    ["Battery → Home", f.batteryToHome, "text-battery"], ["Grid → Home", f.gridToHome, "text-grid"], ["Grid → Battery", f.gridToBattery, "text-grid"],
  ] as const;
  return (
    <div>
      <PageHeader title="Live energy flow" subtitle="Drag the timeline to replay today. Values in kW, AC side; battery conversion loss 5%." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mx-auto aspect-[4/3] max-w-2xl"><EnergyFlow flows={f} solarKW={p.solar} loadKW={p.load} soc={p.soc} hasBattery={site.batteryKWh > 0} /></div>
          <div className="mt-4 flex items-center gap-4">
            <span className="num w-14 text-sm">{p.label}</span>
            <Slider value={[hour]} min={0} max={23} step={1} onValueChange={(v) => setHour(v[0])} />
          </div>
        </Panel>
        <Panel title="Energy balance">
          <div className="space-y-2">
            {rows.map(([l, v, c]) => (
              <div key={l} className="flex items-center justify-between rounded-xl bg-background/40 px-3 py-2 text-sm">
                <span className={c}>{l}</span><span className="num">{fmt(v, 2)} kW</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-border p-3 text-xs text-muted-foreground">
            Supply to home <span className="num text-foreground">{fmt(supply, 2)} kW</span> = consumption <span className="num text-foreground">{fmt(p.load, 2)} kW</span>
            {Math.abs(supply - p.load) < 0.01 ? <span className="ml-1 text-solar">✓ balanced</span> : null}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Battery ↔ grid exchange is disabled for this installation (not supported by contract).</p>
        </Panel>
      </div>
    </div>
  );
}
