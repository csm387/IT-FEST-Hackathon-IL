import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ExternalLink, Scale } from "lucide-react";
import { PageHeader, Panel, ron } from "@/components/solar/ui";
import { compensationRule, monthlyBill } from "@/lib/energy";

export const Route = createFileRoute("/_console/regulations")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Romanian Prosumer Regulations — SolarOps" },
    { name: "description", content: "Compensare cantitativă vs regularizare financiară explained, with a rules calculator." },
    { property: "og:title", content: "Romanian Prosumer Regulations — SolarOps" },
    { property: "og:description", content: "Prosumer compensation rules in Romania with a calculator." },
  ]}),
  component: Regs,
});

const field = "mt-1 h-10 w-full rounded-xl border border-border bg-background/40 px-3 text-sm";
const sources = [
  ["ANRE — Prosumatori", "https://www.anre.ro/"],
  ["Portal legislativ (legislatie.just.ro)", "https://legislatie.just.ro/"],
  ["Monitorul Oficial", "https://www.monitoruloficial.ro/"],
  ["OPCOM — Piața pentru Ziua Următoare", "https://www.opcom.ro/"],
];

function Regs() {
  const [i, setI] = useState({ capacityKW: 10, customer: "individual" as "individual" | "company", contract: "fixed", retail: 1.3, exportP: 0.45, date: "2026-10-24", importKWh: 300, exportKWh: 420 });
  const rule = compensationRule({ capacityKW: i.capacityKW, customer: i.customer, effectiveDate: i.date });
  const q = monthlyBill({ importKWh: i.importKWh, exportKWh: i.exportKWh, retailRON: i.retail, exportRON: i.exportP, mechanism: "quantity" });
  const fin = monthlyBill({ importKWh: i.importKWh, exportKWh: i.exportKWh, retailRON: i.retail, exportRON: i.exportP, mechanism: "financial" });
  const set = (k: keyof typeof i) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setI({ ...i, [k]: e.target.type === "number" ? +e.target.value : e.target.value });

  return (
    <div>
      <PageHeader title="Romanian energy regulations" subtitle="How prosumer compensation may apply to your installation" />
      <div className="mb-6 flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
        <p>Calculations are informational only. Always verify against current legislation, ANRE rules, implementing methodology and your actual supplier contract.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Compensare cantitativă">
          <p className="text-sm text-muted-foreground">Quantity compensation: each kWh exported offsets a kWh imported within the settlement period (usually monthly). Unused surplus may be carried forward for a limited period according to the contract. Applies to prosumers up to the installed-capacity threshold.</p>
        </Panel>
        <Panel title="Regularizare financiară">
          <p className="text-sm text-muted-foreground">Financial settlement: exported energy is valued at a contract-defined price (often linked to the average day-ahead price) and netted against the value of energy imported. Typical above the quantity threshold, or by contract choice.</p>
        </Panel>
        <Panel title="Thresholds & changes" className="lg:col-span-2">
          <ul className="space-y-2 text-sm">
            <li>• Historical threshold for quantity compensation: <b>200 kW</b> installed capacity.</li>
            <li>• Law 160/2026 reportedly raises the threshold to <b>400 kW</b>. <span className="rounded bg-warning/15 px-1.5 py-0.5 text-xs text-warning">Verification required</span> — confirm the text in Monitorul Oficial and the ANRE implementing methodology before relying on it.</li>
            <li>• Tariffs are contract-dependent. The OPCOM day-ahead price is <b>not</b> the retail price paid by households.</li>
          </ul>
        </Panel>
      </div>

      <Panel className="mt-6" title={<span className="flex items-center gap-2"><Scale className="h-4 w-4 text-solar" />Rules engine</span>}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <label>Installed capacity (kW)<input type="number" className={field} value={i.capacityKW} onChange={set("capacityKW")} /></label>
            <label>Customer type<select className={field} value={i.customer} onChange={set("customer")}><option value="individual">Individual</option><option value="company">Company</option></select></label>
            <label>Supplier contract<select className={field} value={i.contract} onChange={set("contract")}><option value="fixed">Fixed price</option><option value="tou">Time-of-use</option><option value="dynamic">Dynamic</option></select></label>
            <label>Effective regulation date<input type="date" className={field} value={i.date} onChange={set("date")} /></label>
            <label>Purchase tariff (RON/kWh)<input type="number" step="0.05" className={field} value={i.retail} onChange={set("retail")} /></label>
            <label>Export compensation (RON/kWh)<input type="number" step="0.05" className={field} value={i.exportP} onChange={set("exportP")} /></label>
            <label>Monthly import (kWh)<input type="number" className={field} value={i.importKWh} onChange={set("importKWh")} /></label>
            <label>Monthly export (kWh)<input type="number" className={field} value={i.exportKWh} onChange={set("exportKWh")} /></label>
          </div>
          <div>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs uppercase tracking-wider text-solar">Likely mechanism</p>
              <p className="mt-1 text-lg font-semibold">{rule.mechanism === "quantity" ? "Compensare cantitativă" : "Regularizare financiară"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{rule.explanation}</p>
              {rule.verify && <p className="mt-2 text-xs text-warning">Threshold of {rule.thresholdKW} kW based on reported Law 160/2026 — verify.</p>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-background/40 p-3"><p className="text-xs text-muted-foreground">Quantity: monthly bill</p><p className="num text-xl">{ron(q.costRON)} RON</p><p className="text-xs text-muted-foreground">{q.carryOutKWh} kWh carried forward</p></div>
              <div className="rounded-xl bg-background/40 p-3"><p className="text-xs text-muted-foreground">Financial: monthly bill</p><p className="num text-xl">{ron(fin.costRON)} RON</p><p className="text-xs text-muted-foreground">Export credited {ron(fin.exportValueRON)} RON</p></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Excludes network tariffs, taxes, excise and VAT. Estimate only.</p>
          </div>
        </div>
      </Panel>
      <Panel className="mt-6" title="Official sources">
        <div className="grid gap-2 sm:grid-cols-2">{sources.map(([l, u]) => <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-accent">{l}<ExternalLink className="h-4 w-4 text-muted-foreground" /></a>)}</div>
      </Panel>
    </div>
  );
}
