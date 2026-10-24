import { useWorkspace } from '@/components/solar/WorkspaceProvider';
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarClock, Wrench, Cpu, LayoutGrid, ChevronRight, ExternalLink, Search, CircleHelp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/solar/ui";
import { getSites } from "@/lib/fleet";
import { DEFAULT_MAINTENANCE_MONTHS, MAINTENANCE_DEMO_DATE, maintenanceDemo, maintenanceStatus } from "@/lib/maintenance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/maintenance")({
  head: () => ({ meta: [
    { title: "Updates & maintenance — GridPulse" },
    { name: "description", content: "Equipment manufacturers, software update status and service dates with a default 24-month maintenance interval." },
    { property: "og:title", content: "Updates & maintenance — GridPulse" },
    { property: "og:description", content: "Review inverter software information and upcoming solar installation maintenance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Maintenance,
});

const support: Record<string, string> = {
  Huawei: "https://solar.huawei.com/", SMA: "https://www.sma.de/en", Fronius: "https://www.fronius.com/en/solar-energy",
  Victron: "https://www.victronenergy.com/support-and-downloads", Growatt: "https://en.growatt.com/", SolarEdge: "https://www.solaredge.com/",
};
const labels = { overdue: "Overdue", soon: "Due within 60 days", scheduled: "Scheduled" };
const tones = { overdue: "text-destructive bg-destructive/10", soon: "text-warning bg-warning/10", scheduled: "text-success bg-success/10" };
const date = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

function Maintenance() {
  const { maintenance: records } = useWorkspace();
  const [view, setView] = useState<"inverter" | "panel">("inverter");
  const [query, setQuery] = useState("");
  const [manufacturer, setManufacturer] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const brands = [...new Set(records.map((r) => view === "inverter" ? r.site.manufacturer : r.panelManufacturer))].sort();
  const shown = records.filter((r) => (manufacturer === "All" || r.site.manufacturer === manufacturer || r.panelManufacturer === manufacturer) && (status === "All" || maintenanceStatus(r.next, MAINTENANCE_DEMO_DATE) === status) && `${r.site.name} ${r.site.city} ${r.site.manufacturer} ${r.panelManufacturer}`.toLowerCase().includes(query.toLowerCase()));
  const record = records.find((r) => r.site.id === selectedSite);
  const brandRecords = records.filter((r) => (view === "inverter" ? r.site.manufacturer : r.panelManufacturer) === selectedBrand);
  const overdue = records.filter((r) => maintenanceStatus(r.next, MAINTENANCE_DEMO_DATE) === "overdue").length;
  const soon = records.filter((r) => maintenanceStatus(r.next, MAINTENANCE_DEMO_DATE) === "soon").length;

  return <div className="mx-auto max-w-7xl">
    <PageHeader title="Updates & maintenance" subtitle="Equipment care · manufacturer information · service calendar" actions={<span className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"><CalendarClock className="h-4 w-4 text-battery" />Every {DEFAULT_MAINTENANCE_MONTHS} months</span>} />
    <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-warning bg-warning/5 px-4 py-3 text-xs text-muted-foreground"><span className="font-semibold text-warning">Demo records</span> Sample panel manufacturers and service dates · as of {date(MAINTENANCE_DEMO_DATE)}. Software availability is not verified; no manufacturer connection.</div>
    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[{ label: "Installations", value: records.length, icon: LayoutGrid, tone: "text-foreground" }, { label: "Maintenance overdue", value: overdue, icon: Wrench, tone: "text-destructive" }, { label: "Due within 60 days", value: soon, icon: CalendarClock, tone: "text-warning" }, { label: "Software status", value: "Unverified", icon: CircleHelp, tone: "text-battery" }].map((k) => <div key={k.label} className="rounded-lg border border-border bg-card p-4"><k.icon className={cn("mb-4 h-5 w-5", k.tone)} /><p className={cn("num text-2xl font-semibold", k.tone)}>{k.value}</p><p className="mt-1 text-xs text-muted-foreground">{k.label}</p></div>)}
    </div>

    <section className="border-t border-border pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Equipment manufacturers</h2><p className="mt-1 text-xs text-muted-foreground">{brands.length} manufacturers · {view === "inverter" ? "Inverters in your fleet" : "Sample panel inventory"}</p></div><div className="flex gap-1 rounded-md border border-border p-1"><Button size="sm" variant={view === "inverter" ? "secondary" : "ghost"} onClick={() => setView("inverter")}><Cpu />Inverters</Button><Button size="sm" variant={view === "panel" ? "secondary" : "ghost"} onClick={() => setView("panel")}><LayoutGrid />Solar panels</Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{brands.map((brand) => {
        const items = records.filter((r) => (view === "inverter" ? r.site.manufacturer : r.panelManufacturer) === brand);
        return <div key={brand} className="rounded-lg border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{brand}</h3><p className="mt-1 text-xs text-muted-foreground">{items.length} installations · {view === "inverter" ? "Inverter" : "Solar panel"}</p></div>{view === "inverter" ? <Cpu className="h-5 w-5 text-battery" /> : <LayoutGrid className="h-5 w-5 text-solar" />}</div><div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">{view === "inverter" ? <><CircleHelp className="h-4 w-4 text-warning" />Update requirement: unverified</> : <><ShieldCheck className="h-4 w-4 text-success" />Passive panels · no firmware</>}</div><div className="flex items-center justify-between border-t border-border pt-3"><span className="text-xs text-muted-foreground">{view === "inverter" ? "Installed version: not reported" : "Module details available"}</span><Button variant="ghost" size="sm" onClick={() => setSelectedBrand(brand)}>Details<ChevronRight /></Button></div></div>;
      })}</div>
    </section>

    <section className="mt-8 border-t border-border pt-6">
      <h2 className="text-lg font-semibold">Maintenance calendar</h2><p className="mt-1 text-xs text-muted-foreground">Last service → next due date · {DEFAULT_MAINTENANCE_MONTHS}-month interval. Without service history, the installation date is used.</p>
      <div className="my-5 flex flex-wrap gap-3"><div className="relative min-w-0 flex-1 basis-60"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Search maintenance" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search installations or manufacturers…" className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm" /></div><select aria-label="Filter manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm"><option value="All">All manufacturers</option>{[...new Set(records.flatMap((r) => [r.site.manufacturer, r.panelManufacturer]))].sort().map((b) => <option key={b}>{b}</option>)}</select><select aria-label="Filter maintenance status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm"><option value="All">All statuses</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead><tr className="border-b border-border text-xs text-muted-foreground">{["Installation", "Equipment", "Last maintenance", "Next due", "Status", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{shown.map((r) => { const st = maintenanceStatus(r.next, MAINTENANCE_DEMO_DATE); return <tr key={r.site.id} className="border-b border-border hover:bg-accent/30"><td className="px-3 py-4"><Link to="/sites/$id" params={{ id: r.site.id }} className="font-medium hover:text-solar">{r.site.name}</Link><p className="mt-1 text-xs text-muted-foreground">{r.site.city}</p></td><td className="px-3 py-4">{r.site.manufacturer}<p className="mt-1 text-xs text-muted-foreground">{r.panelManufacturer} panels · sample</p></td><td className="px-3 py-4"><span className="num text-xs">{r.last ? date(r.last) : "Not recorded"}</span>{!r.last && <p className="mt-1 text-xs text-muted-foreground">Installed {date(r.site.installDate)}</p>}</td><td className="px-3 py-4"><span className="num text-xs">{date(r.next)}</span><p className="mt-1 text-xs text-muted-foreground">Every 24 months</p></td><td className="px-3 py-4"><span className={cn("rounded-md px-2 py-1 text-xs", tones[st])}>{labels[st]}</span></td><td className="px-3 py-4"><Button variant="ghost" size="icon" aria-label={`Service details for ${r.site.name}`} onClick={() => setSelectedSite(r.site.id)}><ChevronRight /></Button></td></tr>; })}</tbody></table></div>
      {shown.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No installations match these filters.</p>}<p className="mt-3 text-xs text-muted-foreground">{shown.length} of {records.length} installations</p>
    </section>

    <Dialog open={selectedBrand !== null} onOpenChange={(open) => { if (!open) setSelectedBrand(null); }}><DialogContent className="z-[600] max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>{selectedBrand} · {view === "inverter" ? "Inverters" : "Solar panels"}</DialogTitle><DialogDescription>{brandRecords.length} installations · {view === "panel" ? "Sample manufacturer assignment" : "Manufacturer not connected"}</DialogDescription></DialogHeader><dl className="space-y-3 text-sm"><div><dt className="text-xs text-muted-foreground">Software updates</dt><dd className="mt-1">{view === "inverter" ? "Unverified — installed and latest versions are not available." : "Passive photovoltaic modules do not run firmware. Optimizers and controllers require a separate device check."}</dd></div><div><dt className="text-xs text-muted-foreground">Models in fleet</dt><dd className="mt-1">{view === "inverter" ? [...new Set(brandRecords.map((r) => r.site.inverterModel))].join(", ") : [...new Set(brandRecords.map((r) => `${r.site.panelWp} Wp`))].join(", ") + " · exact models not recorded"}</dd></div><div><dt className="text-xs text-muted-foreground">Maintenance scope</dt><dd className="mt-1">{view === "inverter" ? "Electrical connections, cooling, fault log, protections and manufacturer-approved firmware review." : "Visual inspection, mounting, connectors, cleaning needs and string performance."}</dd></div></dl>{view === "inverter" && selectedBrand && support[selectedBrand] && <Button variant="outline" asChild><a href={support[selectedBrand]} target="_blank" rel="noopener noreferrer">Manufacturer website<ExternalLink /></a></Button>}</DialogContent></Dialog>
    <Dialog open={Boolean(record)} onOpenChange={(open) => { if (!open) setSelectedSite(null); }}><DialogContent className="z-[600] max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>{record?.site.name}</DialogTitle><DialogDescription>Sample service record · not a confirmed appointment</DialogDescription></DialogHeader>{record && <><div className="border-l-2 border-battery pl-4"><p className="text-xs text-muted-foreground">{record.last ? "Last maintenance" : "Installation · no service history"}</p><p className="mt-1 font-semibold">{date(record.last ?? record.site.installDate)}</p><div className="my-4 flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-4 w-4" />+ {DEFAULT_MAINTENANCE_MONTHS} months</div><p className="text-xs text-muted-foreground">Next maintenance due</p><p className="mt-1 font-semibold text-battery">{date(record.next)}</p></div><dl className="space-y-3 text-sm"><div><dt className="text-xs text-muted-foreground">Inverter</dt><dd>{record.site.manufacturer} · {record.site.inverterModel}</dd></div><div><dt className="text-xs text-muted-foreground">Panels · sample manufacturer</dt><dd>{record.panelManufacturer} · {record.site.panels} × {record.site.panelWp} Wp</dd></div><div><dt className="text-xs text-muted-foreground">Software update requirement</dt><dd>Unverified · no version data from manufacturer</dd></div><div><dt className="text-xs text-muted-foreground">Next service</dt><dd>Panel and mounting inspection, electrical checks, inverter fault review and battery checks where applicable.</dd></div></dl><Button variant="outline" asChild><Link to="/sites/$id" params={{ id: record.site.id }}>Open installation<ChevronRight /></Link></Button></>}</DialogContent></Dialog>
  </div>;
}