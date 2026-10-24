import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, ShieldOff, ShieldQuestion, Plus, Search, ChevronRight, FileText, Upload, Trash2, Pencil, RefreshCw, Printer, AlertTriangle, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, ron, fmt } from "@/components/solar/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "@/components/solar/WorkspaceProvider";
import { supabase } from "@/integrations/supabase/client";
import { deleteClaim, deletePolicy, saveClaim, savePolicy } from "@/lib/insurance.functions";
import { CLAIM_STATUSES, currentPolicy, daysRemaining, fleetKpis, policyStatus, STATUS_LABEL, type Claim, type ClaimStatus, type InsuranceStatus, type Policy } from "@/lib/insurance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/insurance")({
  head: () => ({ meta: [
    { title: "Insurance — GridPulse" },
    { name: "description", content: "Solar installation insurance policies, expiry reminders, claims and incident tracking." },
    { property: "og:title", content: "Insurance — GridPulse" },
    { property: "og:description", content: "Manage solar insurance policies and claims across your installations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: InsurancePage,
});

const todayISO = () => new Date().toISOString().slice(0, 10);
const dateFmt = (v: string) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${v}T00:00:00Z`));

const statusTone: Record<InsuranceStatus, string> = {
  active: "text-success bg-success/10",
  expiring: "text-warning bg-warning/10",
  expired: "text-destructive bg-destructive/10",
  none: "text-muted-foreground bg-muted",
};
const statusIcon: Record<InsuranceStatus, typeof ShieldCheck> = { active: ShieldCheck, expiring: ShieldAlert, expired: ShieldOff, none: ShieldQuestion };

export function InsuranceBadge({ status, className }: { status: InsuranceStatus; className?: string }) {
  const Icon = statusIcon[status];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium", statusTone[status], className)}><Icon className="h-3.5 w-3.5" />{STATUS_LABEL[status]}</span>;
}

const EQUIPMENT = ["Solar panels", "Inverter", "Battery", "Mounting", "Cabling", "Monitoring"];
const RISKS = ["Fire", "Storm & hail", "Theft & vandalism", "Flood", "Electrical damage", "Production loss"];
const INCIDENT_TYPES = ["Storm damage", "Hail damage", "Fire", "Theft", "Inverter failure", "Water ingress", "Vandalism", "Other"];

interface PolicyForm {
  id?: string; siteId: string; provider: string; policyNumber: string; insuranceType: string;
  startDate: string; endDate: string; insuredAmount: string; premiumAnnual: string; deductible: string;
  coveredEquipment: string[]; coveredRisks: string[];
}
const emptyForm = (siteId: string): PolicyForm => ({
  siteId, provider: "", policyNumber: "", insuranceType: "All-risk", startDate: todayISO(), endDate: "",
  insuredAmount: "", premiumAnnual: "", deductible: "", coveredEquipment: ["Solar panels", "Inverter"], coveredRisks: ["Fire", "Storm & hail"],
});
const formFrom = (p: Policy): PolicyForm => ({
  id: p.id, siteId: p.siteId, provider: p.provider, policyNumber: p.policyNumber, insuranceType: p.insuranceType,
  startDate: p.startDate, endDate: p.endDate, insuredAmount: String(p.insuredAmount), premiumAnnual: String(p.premiumAnnual),
  deductible: String(p.deductible), coveredEquipment: p.coveredEquipment, coveredRisks: p.coveredRisks,
});

function InsurancePage() {
  const { sites, policies, claims } = useWorkspace();
  const queryClient = useQueryClient();
  const today = todayISO();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | InsuranceStatus>("All");
  const [providerFilter, setProviderFilter] = useState("All");
  const [sort, setSort] = useState<{ key: "site" | "end" | "days"; dir: 1 | -1 }>({ key: "days", dir: 1 });
  const [form, setForm] = useState<PolicyForm | null>(null);
  const [detailSite, setDetailSite] = useState<string | null>(null);
  const [claimForm, setClaimForm] = useState<Claim | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["workspace"] });
  const kpis = useMemo(() => fleetKpis(sites.map(s => s.id), policies, today), [sites, policies, today]);
  const providers = useMemo(() => [...new Set(policies.map(p => p.provider))].sort(), [policies]);

  const rows = useMemo(() => sites.map(site => {
    const policy = currentPolicy(policies, site.id);
    const status = policyStatus(policy, today);
    return { site, policy, status, days: policy ? daysRemaining(policy.endDate, today) : null };
  }).filter(r =>
    (statusFilter === "All" || r.status === statusFilter) &&
    (providerFilter === "All" || r.policy?.provider === providerFilter) &&
    `${r.site.name} ${r.site.city} ${r.policy?.provider ?? ""} ${r.policy?.policyNumber ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  ).sort((a, b) => {
    const d = sort.dir;
    if (sort.key === "site") return a.site.name.localeCompare(b.site.name) * d;
    if (sort.key === "end") return ((a.policy?.endDate ?? "9999") < (b.policy?.endDate ?? "9999") ? -1 : 1) * d;
    return ((a.days ?? 99999) - (b.days ?? 99999)) * d;
  }), [sites, policies, today, query, statusFilter, providerFilter, sort]);

  const detail = detailSite ? rows.find(r => r.site.id === detailSite) ?? null : null;
  const detailClaims = detail ? claims.filter(c => c.siteId === detail.site.id) : [];

  async function submitPolicy() {
    if (!form) return;
    if (!form.provider.trim() || !form.policyNumber.trim() || !form.endDate) { toast.error("Provider, policy number and expiration date are required"); return; }
    if (form.endDate <= form.startDate) { toast.error("Expiration must be after the start date"); return; }
    setSaving(true);
    try {
      const existing = form.id ? policies.find(p => p.id === form.id) : null;
      await savePolicy({ data: {
        id: form.id, siteId: form.siteId, provider: form.provider.trim(), policyNumber: form.policyNumber.trim(),
        insuranceType: form.insuranceType, startDate: form.startDate, endDate: form.endDate,
        insuredAmount: +form.insuredAmount || 0, premiumAnnual: +form.premiumAnnual || 0, deductible: +form.deductible || 0,
        coveredEquipment: form.coveredEquipment, coveredRisks: form.coveredRisks, documents: existing?.documents ?? [],
      } });
      toast.success(form.id ? "Policy updated" : "Policy added");
      setForm(null);
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Policy could not be saved"); }
    setSaving(false);
  }

  async function removePolicy(p: Policy) {
    if (!confirm(`Delete policy ${p.policyNumber} from ${p.provider}?`)) return;
    try { await deletePolicy({ data: { id: p.id } }); toast.success("Policy deleted"); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Policy could not be deleted"); }
  }

  async function submitClaim() {
    if (!claimForm) return;
    if (!claimForm.incidentType || !claimForm.incidentDate) { toast.error("Incident type and date are required"); return; }
    setSaving(true);
    try {
      await saveClaim({ data: claimForm });
      toast.success(claimForm.id ? "Incident updated" : "Incident registered");
      setClaimOpen(false); setClaimForm(null);
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Incident could not be saved"); }
    setSaving(false);
  }

  async function uploadDoc(siteId: string, file: File, target: "policy" | "claim", id: string) {
    const path = `${siteId}/${id}/${file.name}`;
    const { error } = await supabase.storage.from("insurance-docs").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    return { name: file.name, path };
  }

  async function openDoc(path: string) {
    const { data, error } = await supabase.storage.from("insurance-docs").createSignedUrl(path, 300);
    if (error || !data) { toast.error(error?.message ?? "Document could not be opened"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  function exportClaim(c: Claim) {
    const site = sites.find(s => s.id === c.siteId);
    const policy = c.policyId ? policies.find(p => p.id === c.policyId) : currentPolicy(policies, c.siteId);
    const win = window.open("", "_blank");
    if (!win) { toast.error("Allow pop-ups to export the summary"); return; }
    win.document.write(`<html><head><title>Incident summary — ${site?.name ?? ""}</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}td{border:1px solid #ccc;padding:8px;font-size:13px}td:first-child{width:220px;color:#555}</style></head><body>
      <h1>Insurance incident summary</h1>
      <p>Generated ${dateFmt(today)} · GridPulse. Coverage and compensation depend on the actual policy and insurer — this summary does not guarantee either.</p>
      <table>
        <tr><td>Installation</td><td>${site?.name ?? c.siteId} · ${site?.city ?? ""}</td></tr>
        <tr><td>Incident date</td><td>${dateFmt(c.incidentDate)}</td></tr>
        <tr><td>Incident type</td><td>${c.incidentType}</td></tr>
        <tr><td>Description</td><td>${c.description || "—"}</td></tr>
        <tr><td>Affected equipment</td><td>${c.affectedEquipment.join(", ") || "—"}</td></tr>
        <tr><td>Estimated repair cost</td><td>${ron(c.repairCost)} RON</td></tr>
        <tr><td>Estimated lost energy</td><td>${fmt(c.lostEnergyKwh)} kWh</td></tr>
        <tr><td>Estimated financial loss</td><td>${ron(c.financialLoss)} RON</td></tr>
        <tr><td>Claim status</td><td>${c.status}</td></tr>
        <tr><td>Policy</td><td>${policy ? `${policy.provider} · ${policy.policyNumber} · valid until ${dateFmt(policy.endDate)}` : "No policy registered"}</td></tr>
      </table></body></html>`);
    win.document.close();
    win.print();
  }

  const toggleSort = (key: typeof sort.key) => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Insurance" subtitle="Policies · expiry reminders · claims & incidents" actions={<>
        <Button variant="outline" onClick={() => { setClaimForm({ id: undefined as unknown as string, siteId: sites[0]?.id ?? "", policyId: null, incidentDate: today, incidentType: INCIDENT_TYPES[0], description: "", affectedEquipment: [], repairCost: 0, lostEnergyKwh: 0, financialLoss: 0, status: "Draft", attachments: [] }); setClaimOpen(true); }}><AlertTriangle />Register incident</Button>
        <Button onClick={() => setForm(emptyForm(sites[0]?.id ?? ""))}><Plus />Add policy</Button>
      </>} />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        {[
          { label: "Insured installations", value: kpis.insured, icon: ShieldCheck, tone: "text-success" },
          { label: "Active policies", value: kpis.active, icon: ShieldCheck, tone: "text-success" },
          { label: "Expiring ≤ 30 days", value: kpis.expiring, icon: ShieldAlert, tone: "text-warning" },
          { label: "Expired", value: kpis.expired, icon: ShieldOff, tone: "text-destructive" },
          { label: "Not insured", value: kpis.uninsured, icon: ShieldQuestion, tone: "text-muted-foreground" },
          { label: "Total insured value", value: `${ron(kpis.totalInsuredValue)} RON`, icon: FileText, tone: "text-battery" },
        ].map(k => <div key={k.label} className="rounded-lg border border-border bg-card p-4"><k.icon className={cn("mb-3 h-5 w-5", k.tone)} /><p className={cn("num text-xl font-semibold", k.tone)}>{k.value}</p><p className="mt-1 text-xs text-muted-foreground">{k.label}</p></div>)}
      </div>

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Installations</h2><p className="mt-1 text-xs text-muted-foreground">{rows.length} of {sites.length} installations · click a row for the full policy</p></div>
        </div>
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative min-w-0 flex-1 basis-60"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Search insurance" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search installations, providers, policy numbers…" className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm" /></div>
          <select aria-label="Filter insurance status" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-md border border-border bg-card px-3 py-2 text-sm"><option value="All">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select aria-label="Filter provider" value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm"><option value="All">All providers</option>{providers.map(p => <option key={p}>{p}</option>)}</select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
          <thead><tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-3 py-3 font-medium"><button className="inline-flex items-center gap-1" onClick={() => toggleSort("site")}>Installation<ArrowUpDown className="h-3 w-3" /></button></th>
            <th className="px-3 py-3 font-medium">Location</th><th className="px-3 py-3 font-medium">Provider</th><th className="px-3 py-3 font-medium">Policy no.</th>
            <th className="px-3 py-3 font-medium"><button className="inline-flex items-center gap-1" onClick={() => toggleSort("end")}>Expires<ArrowUpDown className="h-3 w-3" /></button></th>
            <th className="px-3 py-3 font-medium"><button className="inline-flex items-center gap-1" onClick={() => toggleSort("days")}>Days left<ArrowUpDown className="h-3 w-3" /></button></th>
            <th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium"></th>
          </tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.site.id} className="cursor-pointer border-b border-border hover:bg-accent/30" onClick={() => setDetailSite(r.site.id)}>
              <td className="px-3 py-4 font-medium">{r.site.name}</td>
              <td className="px-3 py-4 text-muted-foreground">{r.site.city}</td>
              <td className="px-3 py-4">{r.policy?.provider ?? "—"}</td>
              <td className="px-3 py-4 num text-xs">{r.policy?.policyNumber ?? "—"}</td>
              <td className="px-3 py-4 num text-xs">{r.policy ? dateFmt(r.policy.endDate) : "—"}</td>
              <td className="px-3 py-4 num text-xs">{r.days === null ? "—" : r.days < 0 ? `${-r.days} overdue` : r.days}</td>
              <td className="px-3 py-4"><InsuranceBadge status={r.status} /></td>
              <td className="px-3 py-4"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
            </tr>
          ))}</tbody>
        </table></div>
        {rows.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No installations match these filters.</p>}
      </section>

      <section className="mt-10 border-t border-border pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-lg font-semibold">Claims & incidents</h2><p className="mt-1 text-xs text-muted-foreground">{claims.length} registered · coverage and compensation always depend on the actual policy and insurer</p></div>
        </div>
        {claims.length === 0 ? <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No incidents registered yet.</p> : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{claims.map(c => {
            const site = sites.find(s => s.id === c.siteId);
            return <div key={c.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-semibold">{c.incidentType}</h3><p className="mt-1 text-xs text-muted-foreground">{site?.name ?? "Unknown site"} · {dateFmt(c.incidentDate)}</p></div>
                <select aria-label="Claim status" value={c.status} onChange={async e => { try { await saveClaim({ data: { ...c, status: e.target.value as ClaimStatus } }); await refresh(); } catch (err) { toast.error(err instanceof Error ? err.message : "Status could not be saved"); } }} className="rounded-md border border-border bg-background px-2 py-1 text-xs">{CLAIM_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
              </div>
              {c.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md border border-border p-2"><p className="num font-semibold">{ron(c.repairCost)}</p><p className="text-muted-foreground">RON repair</p></div>
                <div className="rounded-md border border-border p-2"><p className="num font-semibold">{fmt(c.lostEnergyKwh)}</p><p className="text-muted-foreground">kWh lost</p></div>
                <div className="rounded-md border border-border p-2"><p className="num font-semibold">{ron(c.financialLoss)}</p><p className="text-muted-foreground">RON loss</p></div>
              </div>
              {c.attachments.length > 0 && <div className="mt-3 space-y-1">{c.attachments.map(a => <button key={a.path} onClick={() => void openDoc(a.path)} className="flex items-center gap-2 text-xs text-solar hover:underline"><FileText className="h-3.5 w-3.5" />{a.name}</button>)}</div>}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><Upload className="h-3.5 w-3.5" />Attach report<input type="file" accept=".pdf,image/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const doc = await uploadDoc(c.siteId, f, "claim", c.id); if (doc) { try { await saveClaim({ data: { ...c, attachments: [...c.attachments, doc] } }); await refresh(); toast.success("Attachment uploaded"); } catch (err) { toast.error(err instanceof Error ? err.message : "Attachment could not be saved"); } } e.target.value = ""; }} /></label>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Export incident summary" onClick={() => exportClaim(c)}><Printer /></Button>
                  <Button variant="ghost" size="icon" aria-label="Edit incident" onClick={() => { setClaimForm(c); setClaimOpen(true); }}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label="Delete incident" onClick={async () => { if (!confirm("Delete this incident?")) return; try { await deleteClaim({ data: { id: c.id } }); await refresh(); toast.success("Incident deleted"); } catch (err) { toast.error(err instanceof Error ? err.message : "Incident could not be deleted"); } }}><Trash2 /></Button>
                </div>
              </div>
            </div>;
          })}</div>
        )}
      </section>

      {/* Policy detail dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={o => { if (!o) setDetailSite(null); }}>
        <DialogContent className="z-[600] max-h-[85vh] max-w-2xl overflow-y-auto">
          {detail && <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">{detail.site.name}<InsuranceBadge status={detail.status} /></DialogTitle>
              <DialogDescription>{detail.site.city} · {detail.policy ? `${detail.policy.provider} · ${detail.policy.policyNumber}` : "No insurance registered"}</DialogDescription>
            </DialogHeader>
            {detail.policy ? <PolicyDetail policy={detail.policy} days={detail.days!} onEdit={() => setForm(formFrom(detail.policy!))} onRenew={() => { const p = detail.policy!; setForm({ ...formFrom(p), id: undefined, startDate: p.endDate, endDate: "", policyNumber: "" }); }} onDelete={() => { void removePolicy(detail.policy!); setDetailSite(null); }} onUpload={async f => { const doc = await uploadDoc(detail.site.id, f, "policy", detail.policy!.id); if (doc) { try { await savePolicy({ data: { ...detail.policy!, documents: [...detail.policy!.documents, doc] } }); await refresh(); toast.success("Document uploaded"); } catch (err) { toast.error(err instanceof Error ? err.message : "Document could not be saved"); } } }} onOpen={openDoc} onRemoveDoc={async doc => { try { await supabase.storage.from("insurance-docs").remove([doc.path]); await savePolicy({ data: { ...detail.policy!, documents: detail.policy!.documents.filter(d => d.path !== doc.path) } }); await refresh(); } catch (err) { toast.error(err instanceof Error ? err.message : "Document could not be removed"); } }} />
              : <div className="py-6 text-center"><ShieldQuestion className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">This installation has no registered insurance.</p><Button className="mt-4" onClick={() => setForm(emptyForm(detail.site.id))}><Plus />Add policy</Button></div>}
            {detailClaims.length > 0 && <div className="mt-4 border-t border-border pt-4"><h3 className="mb-2 text-sm font-semibold">Incidents on this installation</h3>{detailClaims.map(c => <div key={c.id} className="mb-2 flex items-center justify-between rounded-md border border-border p-3 text-sm"><span>{c.incidentType} · <span className="text-xs text-muted-foreground">{dateFmt(c.incidentDate)}</span></span><span className="rounded-md border border-border px-2 py-0.5 text-xs">{c.status}</span></div>)}</div>}
          </>}
        </DialogContent>
      </Dialog>

      {/* Policy form dialog */}
      <Dialog open={Boolean(form)} onOpenChange={o => { if (!o) setForm(null); }}>
        <DialogContent className="z-[600] max-h-[85vh] max-w-2xl overflow-y-auto">
          {form && <>
            <DialogHeader><DialogTitle>{form.id ? "Edit policy" : "Add policy"}</DialogTitle><DialogDescription>Policy details are stored per installation and drive the expiry reminders.</DialogDescription></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">Installation<select value={form.siteId} onChange={e => setForm({ ...form, siteId: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm">{sites.map(s => <option key={s.id} value={s.id}>{s.name} · {s.city}</option>)}</select></label>
              <label className="text-sm">Provider<input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Allianz-Țiriac" className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
              <label className="text-sm">Policy number<input value={form.policyNumber} onChange={e => setForm({ ...form, policyNumber: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
              <label className="text-sm">Insurance type<select value={form.insuranceType} onChange={e => setForm({ ...form, insuranceType: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm">{["All-risk", "Property damage", "Theft", "Production loss", "Liability"].map(t => <option key={t}>{t}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm">Start date<input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
                <label className="text-sm">Expiration date<input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
              </div>
              <label className="text-sm">Insured amount (RON)<input type="number" min={0} value={form.insuredAmount} onChange={e => setForm({ ...form, insuredAmount: e.target.value })} className="num mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
              <label className="text-sm">Annual premium (RON)<input type="number" min={0} value={form.premiumAnnual} onChange={e => setForm({ ...form, premiumAnnual: e.target.value })} className="num mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
              <label className="text-sm">Deductible / excess (RON)<input type="number" min={0} value={form.deductible} onChange={e => setForm({ ...form, deductible: e.target.value })} className="num mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
              <div className="sm:col-span-2"><p className="mb-2 text-sm">Covered equipment</p><div className="flex flex-wrap gap-2">{EQUIPMENT.map(eq => <button key={eq} type="button" onClick={() => setForm({ ...form, coveredEquipment: form.coveredEquipment.includes(eq) ? form.coveredEquipment.filter(x => x !== eq) : [...form.coveredEquipment, eq] })} className={cn("rounded-md border px-2.5 py-1 text-xs", form.coveredEquipment.includes(eq) ? "border-solar bg-solar/10 text-solar" : "border-border text-muted-foreground")}>{eq}</button>)}</div></div>
              <div className="sm:col-span-2"><p className="mb-2 text-sm">Covered risks</p><div className="flex flex-wrap gap-2">{RISKS.map(r => <button key={r} type="button" onClick={() => setForm({ ...form, coveredRisks: form.coveredRisks.includes(r) ? form.coveredRisks.filter(x => x !== r) : [...form.coveredRisks, r] })} className={cn("rounded-md border px-2.5 py-1 text-xs", form.coveredRisks.includes(r) ? "border-solar bg-solar/10 text-solar" : "border-border text-muted-foreground")}>{r}</button>)}</div></div>
            </div>
            <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button disabled={saving} onClick={() => void submitPolicy()}>{form.id ? "Save changes" : "Add policy"}</Button></div>
          </>}
        </DialogContent>
      </Dialog>

      {/* Claim form dialog */}
      <Dialog open={claimOpen} onOpenChange={o => { if (!o) { setClaimOpen(false); setClaimForm(null); } }}>
        <DialogContent className="z-[600] max-h-[85vh] max-w-2xl overflow-y-auto">
          {claimForm && <>
            <DialogHeader><DialogTitle>{claimForm.id ? "Edit incident" : "Register incident"}</DialogTitle><DialogDescription>Registering an incident does not guarantee coverage or compensation — that depends on the policy and insurer.</DialogDescription></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">Installation<select value={claimForm.siteId} onChange={e => setClaimForm({ ...claimForm, siteId: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm">{sites.map(s => <option key={s.id} value={s.id}>{s.name} · {s.city}</option>)}</select></label>
              <label className="text-sm">Incident date<input type="date" max={today} value={claimForm.incidentDate} onChange={e => setClaimForm({ ...claimForm, incidentDate: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
              <label className="text-sm">Incident type<select value={claimForm.incidentType} onChange={e => setClaimForm({ ...claimForm, incidentType: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm">{INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
              <label className="text-sm">Claim status<select value={claimForm.status} onChange={e => setClaimForm({ ...claimForm, status: e.target.value as ClaimStatus })} className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm">{CLAIM_STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>
              <label className="text-sm sm:col-span-2">Description<textarea value={claimForm.description} onChange={e => setClaimForm({ ...claimForm, description: e.target.value })} rows={3} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" /></label>
              <div className="sm:col-span-2"><p className="mb-2 text-sm">Affected equipment</p><div className="flex flex-wrap gap-2">{EQUIPMENT.map(eq => <button key={eq} type="button" onClick={() => setClaimForm({ ...claimForm, affectedEquipment: claimForm.affectedEquipment.includes(eq) ? claimForm.affectedEquipment.filter(x => x !== eq) : [...claimForm.affectedEquipment, eq] })} className={cn("rounded-md border px-2.5 py-1 text-xs", claimForm.affectedEquipment.includes(eq) ? "border-solar bg-solar/10 text-solar" : "border-border text-muted-foreground")}>{eq}</button>)}</div></div>
              <label className="text-sm">Estimated repair cost (RON)<input type="number" min={0} value={claimForm.repairCost || ""} onChange={e => setClaimForm({ ...claimForm, repairCost: +e.target.value || 0 })} className="num mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
              <label className="text-sm">Estimated lost energy (kWh)<input type="number" min={0} value={claimForm.lostEnergyKwh || ""} onChange={e => setClaimForm({ ...claimForm, lostEnergyKwh: +e.target.value || 0 })} className="num mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
              <label className="text-sm">Estimated financial loss (RON)<input type="number" min={0} value={claimForm.financialLoss || ""} onChange={e => setClaimForm({ ...claimForm, financialLoss: +e.target.value || 0 })} className="num mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" /></label>
            </div>
            <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => { setClaimOpen(false); setClaimForm(null); }}>Cancel</Button><Button disabled={saving} onClick={() => void submitClaim()}>{claimForm.id ? "Save changes" : "Register incident"}</Button></div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyDetail({ policy, days, onEdit, onRenew, onDelete, onUpload, onOpen, onRemoveDoc }: {
  policy: Policy; days: number;
  onEdit: () => void; onRenew: () => void; onDelete: () => void;
  onUpload: (f: File) => Promise<void>; onOpen: (path: string) => Promise<void>; onRemoveDoc: (doc: { name: string; path: string }) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "Days remaining", v: days < 0 ? `${-days} overdue` : days },
          { l: "Insured amount", v: `${ron(policy.insuredAmount)} RON` },
          { l: "Annual premium", v: `${ron(policy.premiumAnnual)} RON` },
          { l: "Deductible", v: `${ron(policy.deductible)} RON` },
        ].map(k => <div key={k.l} className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">{k.l}</p><p className="num mt-1 font-semibold">{k.v}</p></div>)}
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Insurance type</dt><dd className="mt-0.5">{policy.insuranceType}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Validity</dt><dd className="num mt-0.5">{dateFmt(policy.startDate)} → {dateFmt(policy.endDate)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Covered equipment</dt><dd className="mt-0.5">{policy.coveredEquipment.join(", ") || "—"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Covered risks</dt><dd className="mt-0.5">{policy.coveredRisks.join(", ") || "—"}</dd></div>
      </dl>
      <div>
        <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Policy documents</h3>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload />Upload PDF</Button>
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void onUpload(f); e.target.value = ""; }} />
        </div>
        {policy.documents.length === 0 ? <p className="text-xs text-muted-foreground">No documents uploaded yet.</p> : (
          <div className="space-y-1">{policy.documents.map(d => (
            <div key={d.path} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <button onClick={() => void onOpen(d.path)} className="flex items-center gap-2 text-solar hover:underline"><FileText className="h-4 w-4" />{d.name}</button>
              <Button variant="ghost" size="icon" aria-label={`Remove ${d.name}`} onClick={() => void onRemoveDoc(d)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}</div>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onDelete}><Trash2 />Delete</Button>
        <Button variant="outline" onClick={onRenew}><RefreshCw />Renew</Button>
        <Button onClick={onEdit}><Pencil />Edit</Button>
      </div>
    </div>
  );
}
