import { createFileRoute, ClientOnly, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { PageHeader, StatusBadge, statusColor } from "@/components/solar/ui";
import { getSites, STATUS_LABEL } from "@/lib/fleet";
import type { Status } from "@/lib/energy";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const FleetMap = lazy(() => import("@/components/solar/FleetMap"));

export const Route = createFileRoute("/_console/map")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Fleet Map — GridPulse" },
    { name: "description", content: "Interactive map of solar installations across Romania with live status." },
    { property: "og:title", content: "Fleet Map — GridPulse" },
    { property: "og:description", content: "Interactive map of solar installations across Romania." },
  ]}),
  component: MapPage,
});

const sel = "h-9 rounded-xl border border-border bg-background/40 px-3 text-sm";

function MapPage() {
  const all = getSites();
  const navigate = useNavigate();
  const [f, setF] = useState({ region: "", type: "", manufacturer: "", status: "", priority: "", minKWp: 0 });
  const uniq = (k: "region" | "type" | "manufacturer") => [...new Set(all.map((s) => s[k]))].sort();
  const sites = useMemo(() => all.filter((s) =>
    (!f.region || s.region === f.region) && (!f.type || s.type === f.type) && (!f.manufacturer || s.manufacturer === f.manufacturer) &&
    (!f.status || s.status === f.status) && (!f.priority || s.priority === f.priority) && s.kWp >= f.minKWp), [all, f]);
  const counts = (["normal", "under", "critical", "offline"] as Status[]).map((s) => [s, sites.filter((x) => x.status === s).length] as const);

  return (
    <div>
      <PageHeader title="Solar fleet monitoring" subtitle={`${sites.length} installations across Romania`} />
      <div className="mb-4 flex flex-wrap gap-2">
        <select className={sel} value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}><option value="">All regions</option>{uniq("region").map((x) => <option key={x}>{x}</option>)}</select>
        <select className={sel} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">All types</option>{uniq("type").map((x) => <option key={x}>{x}</option>)}</select>
        <select className={sel} value={f.manufacturer} onChange={(e) => setF({ ...f, manufacturer: e.target.value })}><option value="">All manufacturers</option>{uniq("manufacturer").map((x) => <option key={x}>{x}</option>)}</select>
        <select className={sel} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={sel} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option value="">Any priority</option>{["High", "Medium", "Low"].map((x) => <option key={x}>{x}</option>)}</select>
        <select className={sel} value={f.minKWp} onChange={(e) => setF({ ...f, minKWp: +e.target.value })}><option value={0}>Any capacity</option><option value={10}>≥ 10 kWp</option><option value={50}>≥ 50 kWp</option><option value={200}>≥ 200 kWp</option></select>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="glass h-[620px] overflow-hidden rounded-2xl">
          <ClientOnly fallback={<Skeleton className="h-full w-full" />}>
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <FleetMap sites={sites} onOpen={(id) => navigate({ to: "/sites/$id", params: { id } })} />
            </Suspense>
          </ClientOnly>
        </div>
        <div className="glass flex max-h-[620px] flex-col rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-2">
            {counts.map(([s, n]) => <div key={s} className="rounded-xl bg-background/40 p-2 text-xs"><span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", statusColor[s])} />{STATUS_LABEL[s]}<div className="num mt-1 text-lg">{n}</div></div>)}
          </div>
          <div className="mt-3 flex-1 space-y-2 overflow-auto">
            {sites.filter((s) => s.status !== "normal").map((s) => (
              <button key={s.id} onClick={() => navigate({ to: "/sites/$id", params: { id: s.id } })} className="w-full rounded-xl border border-border p-3 text-left hover:bg-accent">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>{s.city}</span><StatusBadge status={s.status} /></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
