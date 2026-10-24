import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel } from "@/components/solar/ui";

export const Route = createFileRoute("/_console/account")({
  head: () => ({ meta: [
    { title: "Account — GridPulse" },
    { name: "description", content: "Your GridPulse profile, account type and company link." },
    { property: "og:title", content: "Account — GridPulse" },
    { property: "og:description", content: "Manage your GridPulse account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: AccountPage,
});

const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm";

function AccountPage() {
  const { account } = Route.useRouteContext();
  const router = useRouter();
  const [name, setName] = useState(account.fullName);
  const [company, setCompany] = useState(account.companyName ?? "");
  const [code, setCode] = useState("");
  const [linkedName, setLinkedName] = useState<string | null>(null);

  useEffect(() => {
    if (account.companyId) supabase.from("profiles").select("company_name").eq("id", account.companyId).maybeSingle().then(({ data }) => setLinkedName(data?.company_name ?? "Linked company"));
  }, [account.companyId]);

  async function save() {
    const { error } = await supabase.from("profiles").update({ full_name: name, ...(account.role === "business" ? { company_name: company } : {}) }).eq("id", account.userId);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); router.invalidate();
  }
  async function link(c: string | null) {
    const { data, error } = await supabase.rpc("link_company", { _code: c ?? "" });
    if (error) { toast.error(error.message.includes("Invalid") ? "That company code doesn't exist." : error.message); return; }
    setLinkedName(data ?? null); setCode(""); toast.success(c ? `Linked to ${data}` : "Company unlinked"); router.invalidate();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Account" subtitle={`${account.email} · ${account.role === "business" ? "Business" : "Individual"} account`} />
      <Panel title="Profile">
        <div className="space-y-3">
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          {account.role === "business" && <input className={input} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />}
          <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button>
        </div>
      </Panel>
      {account.role === "business" ? (
        <Panel title="Client invite code">
          <p className="text-sm text-muted-foreground">Give this code to your clients. When they enter it in their account, their installation appears in your Clients list.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="num rounded-lg border border-border px-4 py-2 text-lg tracking-widest">{account.inviteCode}</span>
            <button onClick={() => { navigator.clipboard.writeText(account.inviteCode ?? ""); toast.success("Copied"); }} className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-accent" aria-label="Copy code"><Copy className="h-4 w-4" /></button>
          </div>
        </Panel>
      ) : (
        <Panel title="Your installer / O&M company">
          {account.companyId ? (
            <div className="flex items-center justify-between">
              <div><div className="font-medium">{linkedName ?? "…"}</div><p className="text-xs text-muted-foreground">This company can see your installation and plan maintenance for it.</p></div>
              <button onClick={() => link(null)} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">Unlink</button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">You can use GridPulse without a company. Link one with their code to get service requests, scheduled maintenance and remote monitoring by your installer.</p>
              <div className="mt-3 flex gap-2">
                <input className={input} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Company code" />
                <button disabled={!code.trim()} onClick={() => link(code)} className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Link</button>
              </div>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
