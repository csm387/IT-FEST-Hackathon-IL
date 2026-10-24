import { useWorkspace } from '@/components/solar/WorkspaceProvider';
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Activity, AlertOctagon, Gauge, Zap, Coins, WifiOff } from "lucide-react";
import { Kpi, PageHeader, Panel, SeverityChip, ron, fmt } from "@/components/solar/ui";
import { buildAlerts, getSites, healthScore, TECHNICIANS, type Alert, type AlertStatus } from "@/lib/fleet";
import { classifyAnomaly } from "@/lib/energy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/operations")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "O&M Center — GridPulse" },
    { name: "description", content: "Fleet-wide anomaly detection, alerts, tickets and technician assignment." },
    { property: "og:title", content: "O&M Center — GridPulse" },
    { property: "og:description", content: "Predictive maintenance and anomaly detection for solar fleets." },
  ]}),
  component: Ops,
});

const STATUSES: AlertStatus[] = ["New", "Investigating", "Scheduled", "Resolved"];
const stCls: Record<AlertStatus, string> = { New: "text-destructive", Investigating: "text-warning", Scheduled: "text-battery", Resolved: "text-solar" };

function Ops() {
  const { sites } = useWorkspace();
  const { alerts, saveAlert } = useWorkspace();
  const [filter, setFilter] = useState<AlertStatus | "All">("All");
  const update = (id: string, patch: Partial<Alert>) => { void saveAlert(id, patch); };
  const open = alerts.filter((a) => a.status !== "Resolved");
  const shown = filter === "All" ? alerts : alerts.filter((a) => a.status === filter);
  const avgHealth = Math.round(sites.reduce((a, s) => a + healthScore(s), 0) / sites.length);

  const engine = useMemo(() => [
    { label: "Clear sky, -55% for 3h", r: classifyAnomaly({ expectedKWh: 40, actualKWh: 18, cloudCover: 10, hoursPersisting: 3, dataCompleteness: 1, minutesSinceLastSeen: 2 }) },
    { label: "Overcast, -60%", r: classifyAnomaly({ expectedKWh: 40, actualKWh: 16, cloudCover: 92, hoursPersisting: 4, dataCompleteness: 1, minutesSinceLastSeen: 2 }) },
    { label: "-30%, only 1h", r: classifyAnomaly({ expectedKWh: 40, actualKWh: 28, cloudCover: 15, hoursPersisting: 1, dataCompleteness: 1, minutesSinceLastSeen: 3 }) },
    { label: "Data gaps (65%)", r: classifyAnomaly({ expectedKWh: 40, actualKWh: 20, cloudCover: 15, hoursPersisting: 3, dataCompleteness: 0.65, minutesSinceLastSeen: 4 }) },
    { label: "No data 2h", r: classifyAnomaly({ expectedKWh: 40, actualKWh: 0, cloudCover: 15, hoursPersisting: 2, dataCompleteness: 0, minutesSinceLastSeen: 120 }) },
  ], []);

  return (
    <div>
      <PageHeader title="O&M operations center" subtitle="Rule-based anomaly detection · weather-aware · ready for ML extension" actions={<Link to="/maintenance" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Updates & maintenance →</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Activity} label="Fleet monitored" value={sites.length} tone="home" />
        <Kpi icon={Gauge} label="Avg health score" value={avgHealth} unit="/100" />
        <Kpi icon={AlertOctagon} label="Open alerts" value={open.length} tone="warning" />
        <Kpi icon={WifiOff} label="Offline devices" value={sites.filter((s) => s.status === "offline").length} tone="destructive" />
        <Kpi icon={Zap} label="Lost energy today" value={fmt(open.reduce((a, b) => a + b.lostKWh, 0), 0)} unit="kWh" tone="warning" estimate />
        <Kpi icon={Coins} label="Financial impact" value={ron(open.reduce((a, b) => a + b.lostRON, 0))} unit="RON" tone="destructive" estimate />
      </div>

      <Panel className="mt-6" title="Alerts & tickets" action={
        <div className="flex gap-1">{(["All", ...STATUSES] as const).map((s) => <button key={s} onClick={() => setFilter(s)} className={cn("rounded-lg px-2.5 py-1 text-xs", filter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>{s}</button>)}</div>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr>{["ID", "Site", "Alert type", "Severity", "Detected", "Lost kWh", "Impact RON", "Technician", "Status"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{shown.map((a) => (
            <tr key={a.id} className="border-t border-border hover:bg-accent/40">
              <td className="num px-3 py-2 text-muted-foreground">{a.id}</td>
              <td className="px-3 py-2"><Link to="/sites/$id" params={{ id: a.siteId }} className="hover:text-solar">{a.siteName}</Link></td>
              <td className="px-3 py-2">{a.type}</td><td className="px-3 py-2"><SeverityChip level={a.severity} /></td>
              <td className="num px-3 py-2 text-xs">{a.detected}</td><td className="num px-3 py-2">{a.lostKWh}</td><td className="num px-3 py-2">{ron(a.lostRON)}</td>
              <td className="px-3 py-2"><select value={a.technician} onChange={(e) => update(a.id, { technician: e.target.value })} className="rounded-lg border border-border bg-background/40 px-2 py-1 text-xs">{TECHNICIANS.map((t) => <option key={t}>{t}</option>)}</select></td>
              <td className="px-3 py-2"><select value={a.status} onChange={(e) => update(a.id, { status: e.target.value as AlertStatus })} className={cn("rounded-lg border border-border bg-background/40 px-2 py-1 text-xs font-medium", stCls[a.status])}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
            </tr>))}</tbody>
        </table></div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Anomaly engine · how deviations are classified">
          <div className="space-y-2">{engine.map((e) => (
            <div key={e.label} className="flex items-center justify-between rounded-xl bg-background/40 px-3 py-2 text-sm">
              <span>{e.label}</span><span className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{e.r.kind}</span><SeverityChip level={e.r.severity} /></span>
            </div>))}</div>
          <p className="mt-3 text-xs text-muted-foreground">Rules check connectivity, data quality, expected vs actual yield, weather (cloud cover) and persistence before flagging hardware faults.</p>
        </Panel>
        <Panel title="Lowest health scores">
          <div className="space-y-2">{[...sites].sort((a, b) => healthScore(a) - healthScore(b)).slice(0, 7).map((s) => (
            <Link key={s.id} to="/sites/$id" params={{ id: s.id }} className="flex items-center gap-3 rounded-xl bg-background/40 px-3 py-2 text-sm hover:bg-accent">
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <div className="h-1.5 w-28 rounded-full bg-muted"><div className={cn("h-1.5 rounded-full", healthScore(s) > 80 ? "bg-solar" : healthScore(s) > 50 ? "bg-warning" : "bg-destructive")} style={{ width: `${healthScore(s)}%` }} /></div>
              <span className="num w-8 text-right">{healthScore(s)}</span>
            </Link>))}</div>
        </Panel>
      </div>
    </div>
  );
}
