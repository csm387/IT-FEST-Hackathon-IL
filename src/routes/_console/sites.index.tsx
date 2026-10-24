import { useWorkspace } from '@/components/solar/WorkspaceProvider';
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, StatusBadge, axis, chartTooltip } from "@/components/solar/ui";
import { getSites, healthScore, siteDay, sumDay } from "@/lib/fleet";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_console/sites/")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Installations — GridPulse" },
    { name: "description", content: "All solar installations with health scores and comparison tools." },
    { property: "og:title", content: "Installations — GridPulse" },
    { property: "og:description", content: "All solar installations with health scores." },
  ]}),
  component: SitesPage,
});

function SitesPage() {
  const { sites } = useWorkspace();
  const [q, setQ] = useState("");
  const [cmp, setCmp] = useState<string[]>([]);
  const list = sites.filter((s) => `${s.name} ${s.city} ${s.manufacturer}`.toLowerCase().includes(q.toLowerCase()));
  const chart = useMemo(() => cmp.map((id) => {
    const s = sites.find((x) => x.id === id)!; const t = sumDay(siteDay(s));
    return { name: s.name, "kWh/kWp actual": +(t.solar / s.kWp).toFixed(2), "kWh/kWp expected": +(t.expected / s.kWp).toFixed(2) };
  }), [cmp, sites]);
  const toggle = (id: string) => setCmp((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 5 ? [...c, id] : c));

  return (
    <div>
      <PageHeader title="Installations" subtitle="Select up to 5 sites to compare specific yield"
        actions={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="h-9 rounded-xl border border-border bg-background/40 px-3 text-sm" />} />
      {cmp.length > 1 && (
        <Panel title="Comparison · specific yield today" className="mb-6" action={<button onClick={() => setCmp([])} className="text-xs text-solar">Clear</button>}>
          <div className="h-64"><ResponsiveContainer><BarChart data={chart}>
            <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} />
            <Tooltip {...chartTooltip} cursor={{ fill: "var(--accent)" }} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="kWh/kWp actual" fill="var(--solar)" radius={[6, 6, 0, 0]} /><Bar dataKey="kWh/kWp expected" fill="var(--muted-foreground)" radius={[6, 6, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </Panel>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => (
          <div key={s.id} className="glass group overflow-hidden rounded-2xl">
            <div className="relative h-40 overflow-hidden">
              <img src={s.image} alt={`${s.name} solar installation`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute left-3 top-3"><StatusBadge status={s.status} /></div>
              <label className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-background/70 px-2 py-1 text-xs"><Checkbox checked={cmp.includes(s.id)} onCheckedChange={() => toggle(s.id)} />Compare</label>
            </div>
            <Link to="/sites/$id" params={{ id: s.id }} className="block p-4">
              <div className="flex items-center justify-between gap-2"><h3 className="truncate font-semibold">{s.name}</h3><span className="num text-sm text-solar">{healthScore(s)}</span></div>
              <p className="text-xs text-muted-foreground">{s.city} · {s.type} · {s.manufacturer}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-muted-foreground">PV</p><p className="num">{s.kWp} kWp</p></div>
                <div><p className="text-muted-foreground">Battery</p><p className="num">{s.batteryKWh || "—"} {s.batteryKWh ? "kWh" : ""}</p></div>
                <div><p className="text-muted-foreground">Perf.</p><p className="num">{Math.round(s.performance * 100)}%</p></div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
