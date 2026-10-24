import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loadAccount, type AccountType } from "@/lib/account";
import { Logo } from "@/components/solar/AppShell";
import { TypePicker } from "./auth";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const a = await loadAccount();
    if (!a) throw redirect({ to: "/auth" });
    if (a.role) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [
    { title: "Choose account type — GridPulse" },
    { name: "description", content: "Tell GridPulse whether this account is for your home or your company." },
    { property: "og:title", content: "Choose account type — GridPulse" },
    { property: "og:description", content: "Individual or business account setup." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [type, setType] = useState<AccountType>("individual");
  const [company, setCompany] = useState("");
  async function save() {
    const { error } = await supabase.rpc("choose_account_type", { _type: type, _company: company || undefined });
    if (error) return toast.error(error.message);
    navigate({ to: type === "business" ? "/business" : "/dashboard" });
  }
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">What is this account for?</h1>
          <TypePicker value={type} onChange={setType} />
          {type === "business" && <input className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} />}
          <p className="text-xs text-muted-foreground">This can't be changed later.</p>
          <button onClick={save} disabled={type === "business" && !company.trim()} className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">Continue</button>
        </div>
      </div>
    </div>
  );
}
