import { useId } from "react";

export interface SankeyInput {
  solar: number; // kWh produced
  gridImport: number;
  batteryDischarge: number;
  batteryCharge: number; // from solar
  gridExport: number; // from solar
  load: number; // total consumption
}

// Typical split of household consumption (simulated until sub-metering is connected)
const USAGE = [
  ["EV charging", 0.32],
  ["Heating & AC", 0.27],
  ["Plug loads", 0.18],
  ["Lighting", 0.1],
  ["Others", 0.13],
] as const;

type Col = 0 | 1 | 2;
interface Node { id: string; label: string; value: number; col: Col; color: string }
interface Link { from: string; to: string; value: number }

const W = 900, H = 340, TOP = 50, NODE_W = 10, GAP = 14;
const COL_X = [20, 430, 690];

export function EnergySankey({ data, unit = "kWh" }: { data: SankeyInput; unit?: string }) {
  const uid = useId().replace(/:/g, "");
  const direct = Math.max(0, data.solar - data.batteryCharge - data.gridExport);
  const homeSupply = direct + data.gridImport + data.batteryDischarge;

  const nodes: Node[] = [
    { id: "solar", label: "Solar panels", value: data.solar, col: 0 as Col, color: "var(--solar)" },
    { id: "grid", label: "Grid import", value: data.gridImport, col: 0 as Col, color: "var(--grid)" },
    { id: "batt-out", label: "Battery", value: data.batteryDischarge, col: 0 as Col, color: "var(--battery)" },
    { id: "home", label: "Home supply", value: homeSupply, col: 1 as Col, color: "var(--home)" },
    { id: "batt-in", label: "Battery charge", value: data.batteryCharge, col: 1 as Col, color: "var(--battery)" },
    { id: "export", label: "Grid export", value: data.gridExport, col: 1 as Col, color: "var(--grid)" },
    ...USAGE.map(([l, r]) => ({ id: l, label: l, value: homeSupply * r, col: 2 as Col, color: "var(--warning)" })),
  ].filter((n) => n.value > 0.05);

  const links: Link[] = [
    { from: "solar", to: "home", value: direct },
    { from: "solar", to: "batt-in", value: data.batteryCharge },
    { from: "solar", to: "export", value: data.gridExport },
    { from: "grid", to: "home", value: data.gridImport },
    { from: "batt-out", to: "home", value: data.batteryDischarge },
    ...USAGE.map(([l, r]) => ({ from: "home", to: l, value: homeSupply * r })),
  ].filter((l) => l.value > 0.05);

  // Layout: scale so the tallest column fits
  const colTotals = [0, 1, 2].map((c) => nodes.filter((n) => n.col === c));
  const avail = H - TOP - 10;
  const scale = Math.min(...colTotals.map((ns) => (avail - GAP * (ns.length - 1)) / ns.reduce((a, n) => a + n.value, 0)));
  const pos: Record<string, { y: number; h: number; outY: number; inY: number }> = {};
  colTotals.forEach((ns, c) => {
    let y = TOP;
    ns.forEach((n) => { const h = Math.max(2, n.value * scale); pos[n.id] = { y, h, outY: y, inY: y }; y += (c === 2 ? Math.max(h, 38) : h) + GAP; });
  });
  const colSum = (c: number) => nodes.filter((n) => n.col === c && n.id !== "batt-in" && n.id !== "export").reduce((a, n) => a + n.value, 0);
  const color = (id: string) => nodes.find((n) => n.id === id)!.color;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Energy flow from sources to usage">
      <defs>
        {links.map((l, i) => (
          <linearGradient key={i} id={`${uid}-g${i}`} x1="0" x2="1">
            <stop offset="0" stopColor={color(l.from)} stopOpacity={0.45} />
            <stop offset="1" stopColor={color(l.to)} stopOpacity={0.45} />
          </linearGradient>
        ))}
      </defs>

      {["1. Sources", "2. Allocation", "3. Usage"].map((t, i) => (
        <g key={t}>
          <text x={COL_X[i]} y={16} fontSize={12} fill="var(--muted-foreground)">{t}</text>
          <text x={COL_X[i]} y={36} fontSize={16} fill="var(--foreground)" fontWeight={600} className="num">
            {(i === 0 ? data.solar + data.gridImport + data.batteryDischarge : i === 1 ? homeSupply + data.batteryCharge + data.gridExport : colSum(2)).toFixed(1)}
            <tspan fontSize={11} fill="var(--muted-foreground)"> {unit}</tspan>
          </text>
        </g>
      ))}

      {links.map((l, i) => {
        const a = pos[l.from], b = pos[l.to];
        const fn = nodes.find((n) => n.id === l.from)!, tn = nodes.find((n) => n.id === l.to)!;
        const h = l.value * scale;
        const x0 = COL_X[fn.col] + NODE_W, x1 = COL_X[tn.col];
        const y0 = a.outY, y1 = b.inY;
        a.outY += h; b.inY += h;
        const mx = (x0 + x1) / 2;
        const d = `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + h} C${mx},${y1 + h} ${mx},${y0 + h} ${x0},${y0 + h} Z`;
        return <path key={i} d={d} fill={`url(#${uid}-g${i})`} className="transition-opacity hover:opacity-80"><title>{`${fn.label} → ${tn.label}: ${l.value.toFixed(1)} ${unit}`}</title></path>;
      })}

      {nodes.map((n) => {
        const p = pos[n.id];
        const x = COL_X[n.col];
        const right = n.col === 2;
        const labelX = right ? x + NODE_W + 10 : x + NODE_W + 8;
        const showInside = !right && p.h > 34;
        return (
          <g key={n.id}>
            <rect x={x} y={p.y} width={NODE_W} height={p.h} rx={4} fill={n.color} />
            {(right || showInside) && (
              <g>
                <rect x={labelX} y={p.y + p.h / 2 - 17} width={right ? 120 : 112} height={34} rx={6} fill="var(--surface)" stroke="var(--border)" />
                <text x={labelX + 8} y={p.y + p.h / 2 - 3} fontSize={10} fill="var(--muted-foreground)">{n.label}</text>
                <text x={labelX + 8} y={p.y + p.h / 2 + 11} fontSize={12} fill="var(--foreground)" fontWeight={600} className="num">{n.value.toFixed(1)} {unit}</text>
              </g>
            )}
            {!right && !showInside && (
              <text x={labelX} y={p.y + p.h / 2 + 4} fontSize={10} fill="var(--muted-foreground)">{n.label} · {n.value.toFixed(1)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function sankeyFromDay(points: { solar: number; load: number; gridImport: number; gridExport: number; batteryCharge: number }[]): SankeyInput {
  return points.reduce<SankeyInput>((a, p) => ({
    solar: a.solar + p.solar, load: a.load + p.load, gridImport: a.gridImport + p.gridImport, gridExport: a.gridExport + p.gridExport,
    batteryCharge: a.batteryCharge + Math.max(0, p.batteryCharge), batteryDischarge: a.batteryDischarge + Math.max(0, -p.batteryCharge),
  }), { solar: 0, load: 0, gridImport: 0, gridExport: 0, batteryCharge: 0, batteryDischarge: 0 });
}
