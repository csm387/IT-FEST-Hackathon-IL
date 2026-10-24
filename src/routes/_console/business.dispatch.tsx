import { useWorkspace } from '@/components/solar/WorkspaceProvider';
import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { PageHeader, StatusBadge, SeverityChip } from "@/components/solar/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { getSites } from "@/lib/fleet";
import { JOB_FLOW, advanceJob, assignCrew, buildJobs, distanceKm, nearestCrew, type Job } from "@/lib/dispatch";
import { cn } from "@/lib/utils";

const DispatchMap = lazy(() => import("@/components/solar/DispatchMap"));

export const Route = createFileRoute("/_console/business/dispatch")({
  head: () => ({ meta: [
    { title: "Dispatch — GridPulse for business" },
    { name: "description", content: "Dispatch map for O&M teams: open interventions, crews and assignments across Romania." },
    { property: "og:title", content: "Dispatch — GridPulse for business" },
    { property: "og:description", content: "Live dispatch board with map, crews and intervention queue." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Dispatch,
});

const sel = "h-9 rounded-xl border border-border bg-background/40 px-3 text-sm";

function Dispatch() {
  const { sites } = useWorkspace();
  const { jobs, crews, saveJob } = useWorkspace();
  const [selected, setSelected] = useState<string | null>(null);
  const [prio, setPrio] = useState(""); const [region, setRegion] = useState("");
  const site = (id: string) => { const found = sites.find(s => s.id === id); if (!found) throw new Error("Installation unavailable"); return found; };
  const regions = [...new Set(sites.map((s) => s.region))].sort();
  const visible = useMemo(() => jobs.filter((j) => (!prio || j.priority === prio) && (!region || site(j.siteId).region === region)), [jobs, prio, region]);
  const mapSites = sites.filter((s) => !region || s.region === region);
  const update = (id: string, f: (j: Job) => Job) => { const job = jobs.find(j => j.id === id); if (job) void saveJob(id, f(job)); };
  const cur = jobs.find((j) => j.id === selected);

  return (
    <div>
      <PageHeader title="Dispatch" subtitle={`${jobs.filter((j) => j.status !== "Resolved").length} open interventions · ${crews.length} crews · simulated`}
        actions={<div className="flex gap-2">
          <select className={sel} value={region} onChange={(e) => setRegion(e.target.value)}><option value="">All regions</option>{regions.map((r) => <option key={r}>{r}</option>)}</select>
          <select className={sel} value={prio} onChange={(e) => setPrio(e.target.value)}><option value="">Any priority</option>{["High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}</select>
        </div>} />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {JOB_FLOW.map((s) => <div key={s} className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">{s}<div className="num mt-1 text-xl text-foreground">{visible.filter((j) => j.status === s).length}</div></div>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="relative h-[680px] overflow-hidden rounded-2xl border border-border">
          <ClientOnly fallback={<Skeleton className="h-full w-full" />}>
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <DispatchMap sites={mapSites} crews={crews} jobs={visible} selected={selected} onSelect={setSelected} />
            </Suspense>
          </ClientOnly>
          {cur && (() => { const s = site(cur.siteId); const near = nearestCrew(s, crews); if (!near) return null; return (
            <div className="absolute bottom-3 left-3 z-[400] w-80 rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex items-center justify-between"><span className="font-semibold">{cur.reference}</span><button onClick={() => setSelected(null)} className="text-xs text-muted-foreground">Close</button></div>
              <p className="mt-1">{cur.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.name} · {s.city} · {s.kWp} kWp · {s.manufacturer}</p>
              <p className="mt-2 text-xs">Nearest crew: <b>{near.name}</b> ({Math.round(distanceKm(s, near))} km)</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => update(cur.id, (j) => assignCrew(j, near.id))} className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Assign nearest</button>
                <Link to="/sites/$id" params={{ id: s.id }} className="rounded-lg border border-border px-3 py-1.5 text-xs">Site</Link>
              </div>
            </div>); })()}
        </div>
        <div className="flex max-h-[680px] flex-col rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-3 text-sm font-semibold">Intervention queue</div>
          <div className="flex-1 space-y-2 overflow-auto p-3">
            {visible.map((j) => { const s = site(j.siteId); return (
              <div key={j.id} onClick={() => setSelected(j.id)} className={cn("cursor-pointer rounded-xl border p-3", j.id === selected ? "border-primary" : "border-border", j.status === "Resolved" && "opacity-50")}>
                <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{j.reference}</span><SeverityChip level={j.priority} /></div>
                <div className="mt-1 text-sm font-medium">{s.name}</div>
                <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground"><span>{j.title}</span></div>
                <div className="mt-1"><StatusBadge status={s.status} /></div>
                <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <select className="h-8 flex-1 rounded-lg border border-border bg-background px-2 text-xs" value={j.crewId ?? ""} disabled={j.status === "Resolved"} onChange={(e) => update(j.id, (x) => assignCrew(x, e.target.value || null))}>
                    <option value="">Unassigned</option>{crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <span className="rounded-md bg-secondary px-2 py-1 text-[11px]">{j.status}</span>
                  {j.status !== "Resolved" && <button disabled={!j.crewId} onClick={() => update(j.id, advanceJob)} className="rounded-lg border border-border px-2 py-1 text-[11px] disabled:opacity-40">Next →</button>}
                </div>
              </div>); })}
            {visible.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No interventions match the filters.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
