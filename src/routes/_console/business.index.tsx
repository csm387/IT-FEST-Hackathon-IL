import { useWorkspace } from '@/components/solar/WorkspaceProvider';
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Gauge, AlertTriangle, Wallet, Sun, Truck } from "lucide-react";
import { Kpi, PageHeader, Panel, StatusBadge, ron, fmt } from "@/components/solar/ui";
import { getSites, healthScore, siteDay, sumDay, STATUS_LABEL, TARIFF } from "@/lib/fleet";
import { buildJobs } from "@/lib/dispatch";
import type { Status } from "@/lib/energy";

export const Route = createFileRoute("/_console/business/")({
  head: () => ({ meta: [
    { title: "Fleet dashboard — GridPulse for business" },
    { name: "description", content: "Portfolio overview for O&M companies: capacity, status, losses and open interventions." },
    { property: "og:title", content: "Fleet dashboard — GridPulse for business" },
    { property: "og:description", content: "Portfolio overview for solar O&M companies." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: BusinessDashboard,
});

function BusinessDashboard() {
  const { sites } = useWorkspace();
  const kWp = sites.reduce((a, s) => a + s.kWp, 0);
  const rows = sites.map((s) => { const t = sumDay(siteDay(s)); const lost = t.solar * (1 / Math.max(s.performance, 0.05) - 1); return { s, t, lost, h: healthScore(s) }; });
  const produced = rows.reduce((a, r) => a + r.t.solar, 0);
  const lostKWh = rows.reduce((a, r) => a + r.lost, 0);
  const { jobs: savedJobs } = useWorkspace();
  const jobs = savedJobs.filter(j => j.status !== "Resolved");
  const worst = [...rows].sort((a, b) => a.h - b.h).slice(0, 6);
  const counts = (["normal", "under", "critical", "offline"] as Status[]).map((st) => [st, sites.filter((s) => s.status === st).length] as const);

  return (
    <div className="space-y-6">
      <PageHeader title="Fleet dashboard" subtitle="Portfolio overview · simulated data"
        actions={<Link to="/business/dispatch" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Truck className="h-4 w-4" />Open dispatch</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi icon={Building2} label="Installations" value={sites.length} hint={`${fmt(kWp / 1000, 2)} MWp total`} />
        <Kpi icon={Sun} label="Produced today" value={fmt(produced / 1000, 2)} unit="MWh" />
        <Kpi icon={Gauge} label="Avg health" value={Math.round(rows.reduce((a, r) => a + r.h, 0) / rows.length)} unit="/100" />
        <Kpi icon={AlertTriangle} label="Open interventions" value={jobs.length} tone="warning" hint={`${jobs.filter((j) => j.priority === "High").length} high priority`} />
        <Kpi icon={Wallet} label="Estimated loss today" value={ron(lostKWh * TARIFF.retailRON)} unit="RON" tone="warning" estimate />
        <Kpi icon={Truck} label="Unassigned" value={jobs.filter((j) => !j.crewId).length} hint="waiting for a crew" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="Status">
          <div className="space-y-3">
            {counts.map(([st, n]) => (
              <div key={st}>
                <div className="flex justify-between text-sm"><span>{STATUS_LABEL[st]}</span><span className="num">{n}</span></div>
                <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${(n / sites.length) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Lowest health" action={<Link to="/sites" className="text-xs text-solar hover:underline">All installations</Link>}>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Site</th><th>Status</th><th className="text-right">Health</th><th className="text-right">Lost today</th></tr></thead>
            <tbody>
              {worst.map(({ s, h, lost }) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2"><Link to="/sites/$id" params={{ id: s.id }} className="hover:underline">{s.name}</Link><div className="text-xs text-muted-foreground">{s.city}</div></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="num text-right">{h}</td>
                  <td className="num text-right">{fmt(lost, 0)} kWh</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
