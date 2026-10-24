import type { Site, Status } from "./energy";
import { computeFlows } from "./energy";

// Deterministic PRNG (no Math.random at module scope — safe on edge runtime)
function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;
export const IMAGES = {
  hero: U("photo-1509391366360-2e959784a276"),
  farm: U("photo-1508514177221-188b1cf16e9d"),
  rooftop: U("photo-1613665813446-82a78c468a1d"),
  panels: U("photo-1559302504-64aae6ca6b6d"),
  field: U("photo-1497440001374-f26997328c1b"),
  house: U("photo-1611365892117-00ac5ef43c90"),
  tech: U("photo-1581094794329-c8112a89af12"),
};
const siteImages = [IMAGES.rooftop, IMAGES.panels, IMAGES.house, IMAGES.farm, IMAGES.field, IMAGES.hero];

const cities: [string, string, number, number][] = [
  ["București", "Muntenia", 44.4268, 26.1025], ["Cluj-Napoca", "Transilvania", 46.7712, 23.6236],
  ["Timișoara", "Banat", 45.7489, 21.2087], ["Iași", "Moldova", 47.1585, 27.6014],
  ["Constanța", "Dobrogea", 44.1598, 28.6348], ["Brașov", "Transilvania", 45.6427, 25.5887],
  ["Craiova", "Oltenia", 44.3302, 23.7949], ["Galați", "Moldova", 45.4353, 28.008],
  ["Oradea", "Crișana", 47.0465, 21.9189], ["Sibiu", "Transilvania", 45.7983, 24.1256],
  ["Ploiești", "Muntenia", 44.9419, 26.0225], ["Arad", "Banat", 46.1866, 21.3123],
  ["Pitești", "Muntenia", 44.8565, 24.8692], ["Bacău", "Moldova", 46.5671, 26.9146],
  ["Suceava", "Bucovina", 47.6514, 26.2556], ["Tulcea", "Dobrogea", 45.1716, 28.7914],
];
const manufacturers: [string, string][] = [
  ["Huawei", "SUN2000-10KTL"], ["SMA", "Sunny Tripower 15"], ["Fronius", "Symo GEN24 10"],
  ["Victron", "MultiPlus-II 48/5000"], ["Growatt", "MOD 12KTL3-XH"], ["SolarEdge", "SE10K-RWS"],
];
const prefixes = ["Casa", "Vila", "Depozit", "Fabrica", "Ferma", "Hala", "Birouri", "Parc"];

function build(): Site[] {
  const r = mulberry(42);
  const out: Site[] = [];
  for (let i = 0; i < 42; i++) {
    const [city, region, lat, lng] = cities[i % cities.length];
    const typeRoll = r();
    const type: Site["type"] = typeRoll < 0.6 ? "Residential" : typeRoll < 0.85 ? "Commercial" : "Industrial";
    const kWp = type === "Residential" ? Math.round(4 + r() * 8) : type === "Commercial" ? Math.round(30 + r() * 120) : Math.round(200 + r() * 600);
    const panelWp = [410, 430, 450, 550][Math.floor(r() * 4)];
    const [manufacturer, inverterModel] = manufacturers[Math.floor(r() * manufacturers.length)];
    const hasBat = type === "Residential" ? r() < 0.75 : r() < 0.4;
    const batteryKWh = hasBat ? (type === "Residential" ? [5, 10, 15][Math.floor(r() * 3)] : Math.round(kWp * 0.5)) : 0;
    const sRoll = r();
    const status: Status = sRoll < 0.68 ? "normal" : sRoll < 0.85 ? "under" : sRoll < 0.93 ? "critical" : "offline";
    const performance = status === "normal" ? 0.92 + r() * 0.08 : status === "under" ? 0.65 + r() * 0.2 : status === "critical" ? 0.2 + r() * 0.3 : 0;
    const year = 2019 + Math.floor(r() * 7);
    out.push({
      id: `ro-${String(i + 1).padStart(3, "0")}`,
      name: `${prefixes[Math.floor(r() * prefixes.length)]} ${city.split("-")[0]} ${i + 1}`,
      city, region,
      lat: lat + (r() - 0.5) * 0.35, lng: lng + (r() - 0.5) * 0.45,
      type, manufacturer, inverterModel, kWp,
      panels: Math.round((kWp * 1000) / panelWp), panelWp,
      batteryModel: hasBat ? (type === "Residential" ? "BYD Battery-Box HVS" : "Huawei LUNA2000 C&I") : null,
      batteryKWh, batteryMaxChargeKW: hasBat ? Math.max(2.5, batteryKWh * 0.5) : 0,
      installDate: `${year}-${String(1 + Math.floor(r() * 12)).padStart(2, "0")}-15`,
      installCostRON: Math.round(kWp * (type === "Residential" ? 4800 : 3600) + batteryKWh * 2400),
      status, performance,
      priority: status === "critical" || status === "offline" ? "High" : status === "under" ? "Medium" : "Low",
      image: siteImages[i % siteImages.length],
      lastSeenMinutes: status === "offline" ? 90 + Math.floor(r() * 600) : Math.floor(r() * 5),
    });
  }
  return out;
}

let cache: Site[] | null = null;
export function getSites(): Site[] {
  if (!cache) cache = build();
  return cache;
}
export function getSite(id: string) {
  return getSites().find((s) => s.id === id);
}

// ---------- Time series ----------
/** Clear-sky solar shape for a given hour (Romania, ~Oct): sunrise ~7, sunset ~18. */
export function solarShape(hour: number, sunrise = 7, sunset = 18.5) {
  if (hour <= sunrise || hour >= sunset) return 0;
  const x = (hour - sunrise) / (sunset - sunrise);
  return Math.pow(Math.sin(Math.PI * x), 1.4);
}
export function loadShape(hour: number) {
  const morning = Math.exp(-Math.pow((hour - 7.5) / 1.4, 2)) * 0.9;
  const evening = Math.exp(-Math.pow((hour - 19.5) / 2, 2)) * 1.4;
  return 0.35 + morning + evening;
}

export interface HourPoint {
  hour: number;
  label: string;
  solar: number;
  expected: number;
  load: number;
  batteryCharge: number; // + charging, - discharging
  gridImport: number;
  gridExport: number;
  soc: number;
}

export function siteDay(site: Site, dayOffset = 0, weatherFactor?: number[]): HourPoint[] {
  const r = mulberry(site.id.charCodeAt(5) * 31 + dayOffset * 7 + 3);
  const loadBase = site.type === "Residential" ? 0.9 : site.kWp * 0.18;
  let soc = 0.35;
  const out: HourPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const wf = weatherFactor?.[h] ?? 0.85 + r() * 0.15;
    const expected = site.kWp * 0.82 * solarShape(h + 0.5);
    const solar = expected * wf * (site.status === "offline" ? 0 : site.performance);
    const load = loadBase * loadShape(h) * (0.85 + r() * 0.3);
    const f = computeFlows({ solarKW: solar, loadKW: load, soc, maxChargeKW: site.batteryMaxChargeKW, hasBattery: site.batteryKWh > 0 });
    const batteryCharge = f.solarToBattery - f.batteryToHome;
    if (site.batteryKWh > 0) {
      const usable = site.batteryKWh * 0.9;
      soc = Math.min(1, Math.max(0.1, soc + (batteryCharge > 0 ? batteryCharge * 0.95 : batteryCharge / 0.95) / usable));
    }
    out.push({
      hour: h, label: `${String(h).padStart(2, "0")}:00`,
      solar: +solar.toFixed(2), expected: +(expected * 0.9).toFixed(2), load: +load.toFixed(2),
      batteryCharge: +batteryCharge.toFixed(2), gridImport: +f.gridToHome.toFixed(2), gridExport: +f.solarToGrid.toFixed(2),
      soc: +soc.toFixed(3),
    });
  }
  return out;
}

export function sumDay(points: HourPoint[]) {
  return points.reduce(
    (a, p) => ({
      solar: a.solar + p.solar, load: a.load + p.load, import: a.import + p.gridImport, export: a.export + p.gridExport,
      expected: a.expected + p.expected, charged: a.charged + Math.max(0, p.batteryCharge),
    }),
    { solar: 0, load: 0, import: 0, export: 0, expected: 0, charged: 0 },
  );
}

/** Portfolio residential prosumer used on the prosumer dashboard */
export function homeSite(): Site {
  return getSites().find((s) => s.type === "Residential" && s.batteryKWh >= 10 && s.status === "normal") ?? getSites()[0];
}

export const TARIFF = { retailRON: 1.3, peakRetailRON: 1.45, exportRON: 0.45 };

/** Simulated retail price curve (contract with time-of-use component). */
export function retailAt(hour: number) {
  return hour >= 17 && hour < 22 ? TARIFF.peakRetailRON : hour >= 23 || hour < 6 ? 1.05 : TARIFF.retailRON;
}

export function aggregatePeriod(site: Site, days: number) {
  const out = [] as { label: string; solar: number; load: number; import: number; export: number; charged: number }[];
  for (let d = days - 1; d >= 0; d--) {
    const s = sumDay(siteDay(site, d));
    const date = new Date(Date.UTC(2026, 9, 24 - d));
    out.push({ label: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`, solar: +s.solar.toFixed(1), load: +s.load.toFixed(1), import: +s.import.toFixed(1), export: +s.export.toFixed(1), charged: +s.charged.toFixed(1) });
  }
  return out;
}

export function yearly(site: Site) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const seasonal = [0.35, 0.5, 0.75, 0.95, 1.15, 1.25, 1.3, 1.2, 0.95, 0.7, 0.42, 0.3];
  const day = sumDay(siteDay(site, 0));
  return months.slice(0, 10).map((m, i) => ({
    label: m, solar: +(day.solar * 30 * seasonal[i] / 0.7).toFixed(0), load: +(day.load * 30 * (1.25 - seasonal[i] * 0.3)).toFixed(0),
    import: +(day.import * 30 * (1.4 - seasonal[i] * 0.5)).toFixed(0), export: +(day.export * 30 * seasonal[i] * 1.2).toFixed(0), charged: +(day.charged * 30).toFixed(0),
  }));
}

// ---------- Alerts ----------
export const TECHNICIANS = ["Andrei Popescu", "Ioana Marin", "Mihai Dumitru", "Elena Stan", "Unassigned"];
export type AlertStatus = "New" | "Investigating" | "Scheduled" | "Resolved";
export interface Alert {
  id: string; siteId: string; siteName: string; type: string; severity: "Low" | "Medium" | "High" | "Critical";
  detected: string; lostKWh: number; lostRON: number; technician: string; status: AlertStatus;
}
export function buildAlerts(): Alert[] {
  const r = mulberry(7);
  const types: Record<Status, string[]> = {
    normal: [], under: ["String underperformance", "Soiling suspected", "Partial shading"],
    critical: ["Inverter fault (ISO error)", "String disconnected", "Battery not charging"], offline: ["Inverter offline"],
  };
  const sevFor: Record<Status, Alert["severity"]> = { normal: "Low", under: "Medium", critical: "High", offline: "Critical" };
  const statuses: AlertStatus[] = ["New", "Investigating", "Scheduled", "Resolved"];
  return getSites().filter((s) => s.status !== "normal").map((s, i) => {
    const lost = s.kWp * 3.1 * (1 - s.performance);
    return {
      id: `AL-${1040 + i}`, siteId: s.id, siteName: s.name,
      type: types[s.status][Math.floor(r() * types[s.status].length)], severity: sevFor[s.status],
      detected: `2026-10-${String(18 + Math.floor(r() * 6)).padStart(2, "0")} ${String(7 + Math.floor(r() * 10)).padStart(2, "0")}:${String(Math.floor(r() * 60)).padStart(2, "0")}`,
      lostKWh: +lost.toFixed(1), lostRON: +(lost * TARIFF.retailRON).toFixed(0),
      technician: TECHNICIANS[Math.floor(r() * TECHNICIANS.length)], status: statuses[Math.floor(r() * 3)],
    };
  });
}

export function healthScore(s: Site) {
  if (s.status === "offline") return 0;
  return Math.round(s.performance * 100 - (s.status === "critical" ? 15 : 0));
}

export const STATUS_LABEL: Record<Status, string> = { normal: "Operating normally", under: "Underperforming", critical: "Critical fault", offline: "Offline" };
