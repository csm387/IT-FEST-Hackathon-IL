import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Status } from "@/lib/energy";
import { STATUS_LABEL } from "@/lib/fleet";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass rounded-2xl p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-sm font-semibold tracking-wide text-foreground/90">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const tones = {
  solar: "text-solar bg-solar/10",
  battery: "text-battery bg-battery/10",
  grid: "text-grid bg-grid/10",
  home: "text-home bg-home/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
};
export type Tone = keyof typeof tones;

export function Kpi({ icon: Icon, label, value, unit, tone = "solar", hint, estimate }: { icon: LucideIcon; label: string; value: string | number; unit?: string; tone?: Tone; hint?: string; estimate?: boolean }) {
  return (
    <div className="glass group rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl", tones[tone])}><Icon className="h-4 w-4" /></span>
        {estimate && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Estimate</span>}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold num">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const statusColor: Record<Status, string> = {
  normal: "bg-success", under: "bg-warning", critical: "bg-destructive", offline: "bg-offline",
};
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2 py-0.5 text-xs">
      <span className={cn("h-2 w-2 rounded-full", statusColor[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const sev = { Low: "text-muted-foreground bg-muted", Medium: "text-warning bg-warning/10", High: "text-destructive bg-destructive/10", Critical: "text-destructive-foreground bg-destructive" };
export function SeverityChip({ level }: { level: keyof typeof sev }) {
  return <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", sev[level])}>{level}</span>;
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-background/40 p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition", value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const chartTooltip = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "var(--muted-foreground)" },
};
export const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;

export const ron = (n: number) => new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(n);
export const fmt = (n: number, d = 1) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

export function Ring({ pct, color = "var(--solar)", size = 72, label, sub }: { pct: number; color?: string; size?: number; label?: ReactNode; sub?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--muted)" strokeWidth="3.2" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3.2" strokeDasharray={`${p} 100`} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-tight">
        <div><p className="num text-sm font-semibold">{label ?? `${Math.round(p)}%`}</p>{sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}</div>
      </div>
    </div>
  );
}

/** Horizontal battery illustration with 10 cells */
export function BatteryGauge({ soc, charging }: { soc: number; charging?: boolean }) {
  const cells = 10;
  const filled = Math.round(soc * cells);
  const color = soc < 0.2 ? "bg-destructive" : soc < 0.4 ? "bg-warning" : "bg-battery";
  return (
    <div className="flex items-center">
      <div className="flex h-24 flex-1 gap-1.5 rounded-2xl border-2 border-border p-2">
        {Array.from({ length: cells }).map((_, i) => (
          <span key={i} className={cn("flex-1 rounded-md transition-colors duration-500", i < filled ? color : "bg-muted", charging && i === filled && "animate-pulse bg-battery/40")} />
        ))}
      </div>
      <span className="h-8 w-2 rounded-r-md bg-border" />
    </div>
  );
}
