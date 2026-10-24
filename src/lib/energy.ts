// Pure energy, battery, finance, regulation and anomaly logic. No I/O.

export type Status = "normal" | "under" | "critical" | "offline";

export interface Site {
  id: string;
  name: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  type: "Residential" | "Commercial" | "Industrial";
  manufacturer: string;
  inverterModel: string;
  kWp: number;
  panels: number;
  panelWp: number;
  batteryModel: string | null;
  batteryKWh: number;
  batteryMaxChargeKW: number;
  installDate: string;
  installCostRON: number;
  status: Status;
  performance: number; // 0..1 ratio actual / expected
  priority: "Low" | "Medium" | "High";
  image: string;
  lastSeenMinutes: number;
}

// ---------- Energy balance ----------
export interface Flows {
  solarToHome: number;
  solarToBattery: number;
  solarToGrid: number;
  batteryToHome: number;
  gridToHome: number;
  gridToBattery: number;
  batteryToGrid: number;
}

export interface BalanceInput {
  solarKW: number;
  loadKW: number;
  soc: number; // 0..1
  maxChargeKW: number;
  hasBattery: boolean;
  minSoc?: number;
  gridCharging?: boolean;
  gridChargeKW?: number;
}

/** Self-consumption first, then battery, then grid. All values in kW (AC side). */
export function computeFlows(i: BalanceInput): Flows {
  const f: Flows = { solarToHome: 0, solarToBattery: 0, solarToGrid: 0, batteryToHome: 0, gridToHome: 0, gridToBattery: 0, batteryToGrid: 0 };
  const solar = Math.max(0, i.solarKW);
  const load = Math.max(0, i.loadKW);
  const minSoc = i.minSoc ?? 0.1;
  f.solarToHome = Math.min(solar, load);
  let surplus = solar - f.solarToHome;
  let deficit = load - f.solarToHome;
  if (i.hasBattery && surplus > 0 && i.soc < 0.999) {
    f.solarToBattery = Math.min(surplus, i.maxChargeKW);
    surplus -= f.solarToBattery;
  }
  f.solarToGrid = surplus;
  if (i.hasBattery && deficit > 0 && i.soc > minSoc) {
    f.batteryToHome = Math.min(deficit, i.maxChargeKW);
    deficit -= f.batteryToHome;
  }
  f.gridToHome = deficit;
  if (i.hasBattery && i.gridCharging && i.soc < 0.999) {
    f.gridToBattery = Math.max(0, Math.min(i.gridChargeKW ?? 0, i.maxChargeKW - f.solarToBattery));
  }
  return f;
}

// ---------- Battery ----------
export interface BatteryEstimateInput {
  capacityKWh: number;
  usableRatio: number; // e.g. 0.9
  soc: number; // 0..1 of usable
  chargeKW: number; // positive charging, negative discharging (AC side)
  efficiency: number; // 0..1
}
export interface BatteryEstimate {
  usableKWh: number;
  storedKWh: number;
  remainingKWh: number;
  state: "charging" | "discharging" | "idle";
  hoursToFull: number | null;
  hoursToEmpty: number | null;
}
export function estimateBattery(b: BatteryEstimateInput): BatteryEstimate {
  const usableKWh = b.capacityKWh * b.usableRatio;
  const storedKWh = usableKWh * b.soc;
  const remainingKWh = usableKWh - storedKWh;
  const eps = 0.05;
  if (b.chargeKW > eps && remainingKWh > 0.01) {
    return { usableKWh, storedKWh, remainingKWh, state: "charging", hoursToFull: remainingKWh / (b.chargeKW * b.efficiency), hoursToEmpty: null };
  }
  if (b.chargeKW < -eps && storedKWh > 0.01) {
    return { usableKWh, storedKWh, remainingKWh, state: "discharging", hoursToFull: null, hoursToEmpty: storedKWh / (Math.abs(b.chargeKW) / b.efficiency) };
  }
  return { usableKWh, storedKWh, remainingKWh, state: "idle", hoursToFull: null, hoursToEmpty: null };
}

export function formatHours(h: number | null): string {
  if (h === null || !isFinite(h)) return "—";
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
}

// ---------- Regulations ----------
export interface RuleInput {
  capacityKW: number;
  customer: "individual" | "company";
  effectiveDate: string; // ISO
}
export interface RuleResult {
  mechanism: "quantity" | "financial";
  thresholdKW: number;
  explanation: string;
  verify: boolean;
}
/** Reported change (Law 160/2026): quantity compensation threshold 200 kW -> 400 kW. Must be verified. */
export const THRESHOLD_CHANGE_DATE = "2026-01-01";
export function compensationRule(i: RuleInput): RuleResult {
  const thresholdKW = i.effectiveDate >= THRESHOLD_CHANGE_DATE ? 400 : 200;
  const verify = i.effectiveDate >= THRESHOLD_CHANGE_DATE;
  if (i.capacityKW <= thresholdKW) {
    return {
      mechanism: "quantity",
      thresholdKW,
      verify,
      explanation: `At ${i.capacityKW} kW (≤ ${thresholdKW} kW), quantity compensation (compensare cantitativă) may apply: exported kWh offset imported kWh, typically settled monthly with surplus carried forward per contract.`,
    };
  }
  return {
    mechanism: "financial",
    thresholdKW,
    verify,
    explanation: `At ${i.capacityKW} kW (> ${thresholdKW} kW), financial settlement (regularizare financiară) is likely: exported energy is valued at a contract-defined price and netted against your bill.`,
  };
}

export interface MonthlyBillInput {
  importKWh: number;
  exportKWh: number;
  retailRON: number; // per kWh
  exportRON: number; // per kWh (financial)
  mechanism: "quantity" | "financial";
  carryInKWh?: number;
}
export function monthlyBill(i: MonthlyBillInput) {
  if (i.mechanism === "quantity") {
    const credit = i.exportKWh + (i.carryInKWh ?? 0);
    const netImport = Math.max(0, i.importKWh - credit);
    const carryOut = Math.max(0, credit - i.importKWh);
    return { costRON: netImport * i.retailRON, carryOutKWh: carryOut, exportValueRON: Math.min(credit, i.importKWh) * i.retailRON };
  }
  const exportValueRON = i.exportKWh * i.exportRON;
  return { costRON: i.importKWh * i.retailRON - exportValueRON, carryOutKWh: 0, exportValueRON };
}

// ---------- Finance ----------
export function paybackYears(installCostRON: number, annualSavingsRON: number, annualMaintRON: number) {
  const net = annualSavingsRON - annualMaintRON;
  return net > 0 ? installCostRON / net : Infinity;
}
export function roiPercent(installCostRON: number, lifetimeNetRON: number) {
  return ((lifetimeNetRON - installCostRON) / installCostRON) * 100;
}

// ---------- Anomaly detection ----------
export interface AnomalyInput {
  expectedKWh: number;
  actualKWh: number;
  cloudCover: number; // 0..100 measured during window
  hoursPersisting: number;
  dataCompleteness: number; // 0..1
  minutesSinceLastSeen: number;
}
export type AnomalyKind = "offline" | "data-quality" | "weather" | "fault" | "underperformance" | "none";
export function classifyAnomaly(a: AnomalyInput): { kind: AnomalyKind; severity: "Low" | "Medium" | "High" | "Critical"; deviation: number } {
  const deviation = a.expectedKWh > 0 ? 1 - a.actualKWh / a.expectedKWh : 0;
  if (a.minutesSinceLastSeen > 60) return { kind: "offline", severity: "Critical", deviation };
  if (a.dataCompleteness < 0.8) return { kind: "data-quality", severity: "Low", deviation };
  if (deviation < 0.1) return { kind: "none", severity: "Low", deviation };
  if (a.cloudCover > 70) return { kind: "weather", severity: "Low", deviation };
  if (a.hoursPersisting < 2) return { kind: "none", severity: "Low", deviation };
  if (deviation >= 0.5) return { kind: "fault", severity: "High", deviation };
  return { kind: "underperformance", severity: deviation >= 0.25 ? "Medium" : "Low", deviation };
}

// ---------- Recommendations ----------
export type Slot = "best" | "moderate" | "expensive";
export function classifyHour(surplusKW: number, retailRON: number, peakRetailRON: number): Slot {
  if (surplusKW >= 1.5) return "best";
  if (surplusKW > 0.3 || retailRON < peakRetailRON * 0.8) return "moderate";
  return "expensive";
}

export function shouldNotifySurplus(surplusKW: number, lastNotifiedMinutesAgo: number, quietHour: boolean, thresholdKW = 2) {
  return surplusKW >= thresholdKW && lastNotifiedMinutesAgo >= 60 && !quietHour;
}
