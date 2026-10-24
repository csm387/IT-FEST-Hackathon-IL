// Dispatch rules (pure) + simulated technician crews and jobs.
import type { Site } from "./energy";

export type JobStatus = "New" | "Assigned" | "En route" | "Resolved";
export const JOB_FLOW: JobStatus[] = ["New", "Assigned", "En route", "Resolved"];

export interface Crew { id: string; name: string; lat: number; lng: number; base: string }
export interface Job { id: string; siteId: string; title: string; priority: "High" | "Medium" | "Low"; status: JobStatus; crewId: string | null }

export function nextStatus(s: JobStatus): JobStatus {
  const i = JOB_FLOW.indexOf(s);
  return JOB_FLOW[Math.min(i + 1, JOB_FLOW.length - 1)];
}

/** Assigning a crew moves a New job to Assigned; removing the crew sends it back to New. */
export function assignCrew(job: Job, crewId: string | null): Job {
  if (job.status === "Resolved") return job;
  if (!crewId) return { ...job, crewId: null, status: "New" };
  return { ...job, crewId, status: job.status === "New" ? "Assigned" : job.status };
}

/** A job can only advance past New once a crew is assigned. */
export function advanceJob(job: Job): Job {
  if (!job.crewId && job.status === "New") return job;
  return { ...job, status: nextStatus(job.status) };
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestCrew(site: { lat: number; lng: number }, crews: Crew[]): Crew | null {
  let best: Crew | null = null, d = Infinity;
  for (const c of crews) { const x = distanceKm(site, c); if (x < d) { d = x; best = c; } }
  return best;
}

// ---------- Simulated data ----------
export const CREWS: Crew[] = [
  { id: "c1", name: "Echipa București", base: "București", lat: 44.43, lng: 26.1 },
  { id: "c2", name: "Echipa Cluj", base: "Cluj-Napoca", lat: 46.77, lng: 23.6 },
  { id: "c3", name: "Echipa Iași", base: "Iași", lat: 47.16, lng: 27.59 },
  { id: "c4", name: "Echipa Timișoara", base: "Timișoara", lat: 45.75, lng: 21.23 },
];

export function buildJobs(sites: Site[]): Job[] {
  const titles: Record<string, string> = { critical: "Inverter fault – on-site check", offline: "Site offline – restore comms", under: "Underperformance – panel inspection" };
  return sites.filter((s) => s.status !== "normal").map((s, i) => ({
    id: `J-${1000 + i}`, siteId: s.id, title: titles[s.status], priority: s.priority,
    status: i % 4 === 0 ? "Assigned" : "New", crewId: i % 4 === 0 ? nearestCrew(s, CREWS)!.id : null,
  }));
}
