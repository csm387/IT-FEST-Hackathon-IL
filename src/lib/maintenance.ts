import type { Site } from "./energy";

export const DEFAULT_MAINTENANCE_MONTHS = 24;
export const MAINTENANCE_DEMO_DATE = "2026-10-24";

/** Add calendar months, clamping to the last day of the target month. */
export function nextMaintenanceDate(lastDate: string, months = DEFAULT_MAINTENANCE_MONTHS): string {
  const date = new Date(`${lastDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || !Number.isInteger(months) || months < 1) throw new Error("Invalid maintenance date or interval");
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay))).toISOString().slice(0, 10);
}

export function maintenanceStatus(due: string, today: string): "overdue" | "soon" | "scheduled" {
  const days = (Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  return days < 0 ? "overdue" : days <= 60 ? "soon" : "scheduled";
}

const panelBrands = ["JA Solar", "Jinko Solar", "LONGi", "Trina Solar"];

/** Sample service records only; not manufacturer telemetry or actual work orders. */
export function maintenanceDemo(sites: Site[]) {
  return sites.map((site, i) => {
    const sample = `${2024 + i % 3}-${String(1 + i % 12).padStart(2, "0")}-15`;
    const last = i % 7 === 0 || sample < site.installDate ? null : sample;
    return { site, panelManufacturer: panelBrands[i % panelBrands.length], last, next: nextMaintenanceDate(last ?? site.installDate), basis: last ? "maintenance" as const : "installation" as const };
  });
}