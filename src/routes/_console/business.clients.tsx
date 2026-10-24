import { useWorkspace } from '@/components/solar/WorkspaceProvider';
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, StatusBadge } from "@/components/solar/ui";
import { getSites, healthScore } from "@/lib/fleet";

export const Route = createFileRoute("/_console/business/clients")({
  head: () => ({ meta: [
    { title: "Clients — GridPulse for business" },
    { name: "description", content: "Individual clients linked to your company and their installations." },
    { property: "og:title", content: "Clients — GridPulse for business" },
    { property: "og:description", content: "Your linked clients and their solar installations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Clients,
});

function Clients() {
  const { account } = Route.useRouteContext();
  const { sites } = useWorkspace();
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", account.userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, created_at").eq("company_id", account.userId).order("created_at", { ascending: false });
      if (error) throw error; return data;
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle={`${clients.length} linked individual accounts`} />
      <Panel title="How clients join">
        <p className="text-sm text-muted-foreground">Clients enter your company code <span className="num rounded border border-border px-2 py-0.5 text-foreground">{account.inviteCode}</span> in their Account page. Their home data then appears here.</p>
      </Panel>
      <Panel title="Linked clients">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clients linked yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Client</th><th>Installation (simulated)</th><th>Status</th><th className="text-right">Health</th></tr></thead>
            <tbody>
              {clients.map((c) => { const s = sites.find(site => site.ownerId === c.id); return (
                <tr key={c.id} className="border-t border-border">
                  <td className="py-2 font-medium">{c.full_name || "Unnamed client"}<div className="text-xs text-muted-foreground">since {new Date(c.created_at).toLocaleDateString("ro-RO")}</div></td>
                  <td>{s ? <><Link to="/sites/$id" params={{ id: s.id }} className="hover:underline">{s.kWp} kWp · {s.manufacturer}</Link><div className="text-xs text-muted-foreground">{s.city}</div></> : "No installation"}</td>
                  <td>{s && <StatusBadge status={s.status} />}</td>
                  <td className="num text-right">{s ? healthScore(s) : "—"}</td>
                </tr>); })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
