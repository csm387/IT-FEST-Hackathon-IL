import { Home, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/lib/account";

export function TypePicker({ value, onChange }: { value: AccountType; onChange: (t: AccountType) => void }) {
  const opts = [
    { v: "individual" as const, icon: Home, t: "Individual", d: "My home installation" },
    { v: "business" as const, icon: Building2, t: "Business", d: "Installer / O&M company" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {opts.map((o) => (
        <button type="button" key={o.v} onClick={() => onChange(o.v)} className={cn("rounded-xl border p-3 text-left", value === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-accent")}>
          <o.icon className="h-4 w-4" /><div className="mt-2 text-sm font-semibold">{o.t}</div><div className="text-xs text-muted-foreground">{o.d}</div>
        </button>
      ))}
    </div>
  );
}
