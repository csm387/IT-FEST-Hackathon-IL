import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/solar/AppShell";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/lib/account";
import { TypePicker } from "@/components/solar/TypePicker";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — GridPulse" },
    { name: "description", content: "Sign in or create a GridPulse account for your home or your company." },
    { property: "og:title", content: "Sign in — GridPulse" },
    { property: "og:description", content: "Create an individual or business GridPulse account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: AuthPage,
});

const input = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [type, setType] = useState<AccountType>("individual");
  const [f, setF] = useState({ name: "", company: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/dashboard" }); });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: f.email, password: f.password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: f.name, account_type: type, company_name: type === "business" ? f.company : null } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard" });
        else { toast.success("Check your email to confirm your account."); setMode("in"); }
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setBusy(false); }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) { toast.error(r.error.message ?? "Google sign-in failed"); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center"><Logo /></Link>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex rounded-lg border border-border p-0.5 text-sm">
            {(["in", "up"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={cn("flex-1 rounded-md py-2 font-medium", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{m === "in" ? "Sign in" : "Create account"}</button>)}
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && <>
              <TypePicker value={type} onChange={setType} />
              <input className={input} placeholder="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              {type === "business" && <input className={input} placeholder="Company name" required value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />}
            </>}
            <input className={input} type="email" placeholder="Email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={input} type="password" placeholder="Password" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <button disabled={busy} className="h-10 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
          </form>
          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <button onClick={google} className="h-10 w-full rounded-lg border border-border text-sm font-medium hover:bg-accent">Continue with Google</button>
        </div>
      </div>
    </div>
  );
}
