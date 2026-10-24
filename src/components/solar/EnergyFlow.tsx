import { Sun, Home, BatteryCharging, UtilityPole } from "lucide-react";
import type { Flows } from "@/lib/energy";
import { fmt } from "./ui";

interface Props { flows: Flows; solarKW: number; loadKW: number; soc: number; hasBattery: boolean }

// Node positions in a 400x300 viewBox
const P = { solar: [200, 40], home: [200, 260], battery: [50, 150], grid: [350, 150] } as const;
type N = keyof typeof P;

function Line({ from, to, kw, color }: { from: N; to: N; kw: number; color: string }) {
  const [x1, y1] = P[from]; const [x2, y2] = P[to];
  const cx = (x1 + x2) / 2 + (from === "solar" || to === "solar" ? 0 : 0);
  const cy = (y1 + y2) / 2;
  const d = `M${x1},${y1} Q${cx + (x1 === x2 ? 0 : (200 - cx) * 0.6)},${cy + (y1 === y2 ? 60 : 0)} ${x2},${y2}`;
  const active = kw > 0.02;
  const dur = Math.max(0.6, 3 - kw * 0.4);
  return (
    <g>
      <path d={d} fill="none" stroke="var(--border)" strokeWidth={2} />
      {active && (
        <>
          <path d={d} fill="none" stroke={color} strokeWidth={2.5} className="flow-line" style={{ animationDuration: `${dur}s` }} strokeLinecap="round" />
          {[0, 0.33, 0.66].map((o) => (
            <circle key={o} r={3.5} fill={color}>
              <animateMotion dur={`${dur * 1.6}s`} repeatCount="indefinite" begin={`${o * dur * 1.6}s`} path={d} />
            </circle>
          ))}
        </>
      )}
    </g>
  );
}

function Node({ at, icon: Icon, label, value, color }: { at: N; icon: typeof Sun; label: string; value: string; color: string }) {
  const [x, y] = P[at];
  return (
    <foreignObject x={x - 52} y={y - 34} width={104} height={68} style={{ overflow: "visible" }}>
      <div className="flex flex-col items-center">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface" style={{ color, boxShadow: `0 0 24px -6px ${color}` }}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="num text-xs font-semibold">{value}</span>
      </div>
    </foreignObject>
  );
}

export function EnergyFlow({ flows, solarKW, loadKW, soc, hasBattery }: Props) {
  const batteryKW = flows.solarToBattery + flows.gridToBattery - flows.batteryToHome - flows.batteryToGrid;
  const gridKW = flows.gridToHome + flows.gridToBattery - flows.solarToGrid - flows.batteryToGrid;
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full">
      <Line from="solar" to="home" kw={flows.solarToHome} color="var(--solar)" />
      {hasBattery && <Line from="solar" to="battery" kw={flows.solarToBattery} color="var(--solar)" />}
      <Line from="solar" to="grid" kw={flows.solarToGrid} color="var(--solar)" />
      {hasBattery && <Line from="battery" to="home" kw={flows.batteryToHome} color="var(--battery)" />}
      <Line from="grid" to="home" kw={flows.gridToHome} color="var(--grid)" />
      {hasBattery && flows.gridToBattery > 0 && <Line from="grid" to="battery" kw={flows.gridToBattery} color="var(--grid)" />}
      <Node at="solar" icon={Sun} label="Solar" value={`${fmt(solarKW)} kW`} color="var(--solar)" />
      <Node at="home" icon={Home} label="Home" value={`${fmt(loadKW)} kW`} color="var(--home)" />
      {hasBattery && <Node at="battery" icon={BatteryCharging} label={`Battery ${Math.round(soc * 100)}%`} value={`${batteryKW >= 0 ? "+" : ""}${fmt(batteryKW)} kW`} color="var(--battery)" />}
      <Node at="grid" icon={UtilityPole} label={gridKW > 0 ? "Grid import" : "Grid export"} value={`${fmt(Math.abs(gridKW))} kW`} color="var(--grid)" />
    </svg>
  );
}
