import { workspaceQuery } from '@/components/solar/WorkspaceProvider';
import { useWorkspace } from '@/components/solar/WorkspaceProvider';
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, MapPin, Cpu, LayoutGrid, BatteryFull, CalendarDays, HeartPulse, PiggyBank, TrendingDown } from "lucide-react";
import { Kpi, Panel, SeverityChip, StatusBadge, axis, chartTooltip, fmt, ron } from "@/components/solar/ui";
import { buildAlerts, getSite, healthScore, siteDay, sumDay, TARIFF } from "@/lib/fleet";
import { currentPolicy, daysRemaining, policyStatus } from "@/lib/insurance";
import { InsuranceBadge } from "./insurance";

export const Route = createFileRoute("/_console/sites/$id")({
  loader: async ({ params, context }) => { const saved = await context.queryClient.ensureQueryData(workspaceQuery(context.account.userId)); const s = saved.sites.find(s => s.id === params.id); if (!s) throw notFound(); return { name: s.name, city: s.city, image: s.image }; },
  head: ({ loaderData }) => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: loaderData ? `${loaderData.name} — GridPulse` : "Installation — GridPulse" },
    { name: "description", content: loaderData ? `Performance, alerts and finances for ${loaderData.name} in ${loaderData.city}.` : "Installation details." },
    { property: "og:title", content: loaderData ? `${loaderData.name} — GridPulse` : "Installation — GridPulse" },
    { property: "og:description", content: "Solar installation performance and maintenance." },
    ...(loaderData ? [{ property: "og:image", content: loaderData.image }, { name: "twitter:image", content: loaderData.image }] : []),
  ]}),
  notFoundComponent: () => <div className="p-10 text-center">Installation not found. <Link to="/sites" className="text-solar">Back to list</Link></div>,
  component: SiteDetail,
});


function SiteDetail() {
  const { id } = Route.useParams();
  const { sites, alerts: savedAlerts } = useWorkspace();
  const s = sites.find(site => site.id === id);
  if (!s) throw notFound();
  const history = s.serviceHistory;
  const day = siteDay(s);
  const t = sumDay(day);
  const alerts = savedAlerts.filter((a) => a.siteId === s.id);
  const lostKWh = Math.max(0, t.expected - t.solar);
  return (
    <div>
      <Link to={Route.useRouteContext().account.role === 'business' ? '/sites' : '/dashboard'} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{Route.useRouteContext().account.role === 'business' ? 'Installations' : 'Dashboard'}</Link>
      <div className="glass relative overflow-hidden rounded-3xl">
        <img src={s.image} alt={`${s.name} installation`} className="h-64 w-full object-cover sm:h-80" />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <StatusBadge status={s.status} />
          <h1 className="mt-2 text-3xl font-semibold">{s.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{s.city}, {s.region} · {s.lat.toFixed(4)}, {s.lng.toFixed(4)}</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={LayoutGrid} label="PV capacity" value={s.kWp} unit="kWp" hint={`${s.panels} × ${s.panelWp} Wp panels`} />
        <Kpi icon={Cpu} label="Inverter" value={s.manufacturer} tone="grid" hint={s.inverterModel} />
        <Kpi icon={BatteryFull} label="Battery" value={s.batteryKWh || "None"} unit={s.batteryKWh ? "kWh" : ""} tone="battery" hint={s.batteryModel ?? undefined} />
        <Kpi icon={CalendarDays} label="Installed" value={s.installDate} tone="home" />
        <Kpi icon={HeartPulse} label="Health score" value={healthScore(s)} unit="/100" />
        <Kpi icon={LayoutGrid} label="Production today" value={fmt(t.solar)} unit="kWh" hint={`Expected ${fmt(t.expected)} kWh`} />
        <Kpi icon={PiggyBank} label="Savings today" value={ron((t.solar - t.export) * TARIFF.retailRON + t.export * TARIFF.exportRON)} unit="RON" estimate />
        <Kpi icon={TrendingDown} label="Loss from underperformance" value={ron(lostKWh * TARIFF.retailRON)} unit="RON" tone="destructive" estimate hint={`${fmt(lostKWh)} kWh not produced`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Generation vs expected" className="xl:col-span-2">
          <div className="h-72"><ResponsiveContainer><ComposedChart data={day}>
            <defs><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--solar)" stopOpacity={0.45} /><stop offset="1" stopColor="var(--solar)" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" {...axis} interval={2} /><YAxis {...axis} unit=" kW" />
            <Tooltip {...chartTooltip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Area dataKey="solar" name="Actual" stroke="var(--solar)" fill="url(#gd)" strokeWidth={2} />
            <Line dataKey="expected" name="Expected" stroke="var(--muted-foreground)" strokeDasharray="5 5" dot={false} />
            <Line dataKey="load" name="Consumption" stroke="var(--home)" dot={false} />
          </ComposedChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Active alerts">
          {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No active alerts. System is healthy.</p> : alerts.map((a) => (
            <div key={a.id} className="mb-2 rounded-xl border border-border p-3 text-sm">
              <div className="flex items-center justify-between"><span className="font-medium">{a.type}</span><SeverityChip level={a.severity} /></div>
              <p className="mt-1 text-xs text-muted-foreground">{a.detected} · {a.status} · {a.technician}</p>
            </div>
          ))}
          <h4 className="mb-2 mt-6 text-sm font-semibold">Maintenance history</h4>
          <ol className="space-y-3 border-l border-border pl-4">
            {history.map((h) => <li key={h.date} className="text-sm"><p className="num text-xs text-muted-foreground">{h.date}</p><p>{h.what}</p><p className="text-xs text-muted-foreground">{h.who}</p></li>)}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
