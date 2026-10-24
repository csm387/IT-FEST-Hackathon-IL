import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Sparkles } from "lucide-react";
import { PageHeader, Panel } from "@/components/solar/ui";
import { useNotifications, type Priority } from "@/components/solar/notifications";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_console/notifications")({
  head: () => ({ meta: [
    { title: "Notification Center — SolarOps" },
    { name: "description", content: "Solar surplus alerts, battery and fault notifications with quiet hours." },
    { property: "og:title", content: "Notification Center — SolarOps" },
    { property: "og:description", content: "Smart solar energy notifications." },
  ]}),
  component: NotesPage,
});

const pri: Record<Priority, string> = { info: "bg-grid/15 text-grid", opportunity: "bg-solar/15 text-solar", warning: "bg-warning/15 text-warning", critical: "bg-destructive/15 text-destructive" };

function NotesPage() {
  const { notes, prefs, setPrefs, markAll, markRead, push } = useNotifications();
  const enablePush = async (v: boolean) => {
    if (v && typeof Notification !== "undefined") {
      const p = await Notification.requestPermission();
      if (p !== "granted") { toast("Browser notifications blocked", { description: "Allow notifications in your browser settings." }); return; }
    }
    setPrefs({ ...prefs, push: v });
  };
  const toggles: [keyof typeof prefs, string][] = [["surplus", "Solar surplus opportunities"], ["battery", "Battery almost full / not charging"], ["peak", "Production peaks & price windows"], ["faults", "Faults, offline & maintenance"]];
  return (
    <div>
      <PageHeader title="Notification center" actions={<>
        <button onClick={() => push({ key: `test-${Date.now()}`, kind: "actual", priority: "opportunity", title: "☀️ Perfect time to use solar energy!", body: "Your panels produce 5.2 kW and your home uses 1.4 kW — about 3.8 kW surplus. Start the washing machine or charge your EV." })} className="flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground"><Sparkles className="h-4 w-4" />Send test</button>
        <button onClick={markAll} className="h-9 rounded-xl border border-border px-3 text-sm">Mark all read</button>
      </>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="History" className="lg:col-span-2">
          <div className="space-y-2">
            {notes.map((n) => (
              <button key={n.id} onClick={() => markRead(n.id)} className={cn("flex w-full gap-3 rounded-xl border border-border p-4 text-left transition hover:bg-accent", !n.read && "border-primary/30 bg-primary/5")}>
                <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{n.title}</span>
                    <span className={cn("rounded px-1.5 text-[10px] uppercase", pri[n.priority])}>{n.priority}</span>
                    <span className="rounded border border-border px-1.5 text-[10px] uppercase text-muted-foreground">{n.kind === "actual" ? "Current" : n.kind === "forecast" ? "Forecast" : "System"}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                </div>
                <span className="num shrink-0 text-xs text-muted-foreground">{n.time}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Preferences">
          <div className="space-y-4 text-sm">
            {toggles.map(([k, l]) => <label key={k} className="flex items-center justify-between gap-3">{l}<Switch checked={!!prefs[k]} onCheckedChange={(v) => setPrefs({ ...prefs, [k]: v })} /></label>)}
            <label className="flex items-center justify-between gap-3">Browser push notifications<Switch checked={prefs.push} onCheckedChange={enablePush} /></label>
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">Quiet hours</p>
              <div className="mt-2 flex items-center gap-2">
                <input type="number" min={0} max={23} value={prefs.quietStart} onChange={(e) => setPrefs({ ...prefs, quietStart: +e.target.value })} className="num h-9 w-16 rounded-lg border border-border bg-background/40 px-2" />
                <span>to</span>
                <input type="number" min={0} max={23} value={prefs.quietEnd} onChange={(e) => setPrefs({ ...prefs, quietEnd: +e.target.value })} className="num h-9 w-16 rounded-lg border border-border bg-background/40 px-2" />
              </div>
            </div>
            <div><p className="text-xs text-muted-foreground">Surplus threshold (kW)</p>
              <input type="number" step={0.5} value={prefs.thresholdKW} onChange={(e) => setPrefs({ ...prefs, thresholdKW: +e.target.value })} className="num mt-2 h-9 w-20 rounded-lg border border-border bg-background/40 px-2" /></div>
            <p className="text-xs text-muted-foreground">Duplicates are suppressed: the same alert is sent at most once per hour.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
