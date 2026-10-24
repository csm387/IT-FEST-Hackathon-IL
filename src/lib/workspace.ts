import type { Site } from './energy';
import type { HourPoint, Alert } from './fleet';
import type { Crew, Job } from './dispatch';
import type { Claim, Policy } from './insurance';

export interface StoredSite extends Site {
  ownerId: string;
  readings: HourPoint[][];
  monthly?: { label: string; solar: number; load: number; import: number; export: number; charged: number }[];
  serviceHistory: { date: string; what: string; who: string }[];
  batteryHealth: { soh: number; cycles: number; temperature: number };
}
export interface Workspace {
  sites: StoredSite[];
  crews: Crew[];
  jobs: (Job & { reference: string })[];
  alerts: Alert[];
  maintenance: { site: StoredSite; panelManufacturer: string; last: string | null; next: string; basis: 'maintenance' | 'installation' }[];
  policies: Policy[];
  claims: Claim[];
}
export function workspaceHome(sites: StoredSite[], userId: string): StoredSite {
  const owned = sites.filter(s => s.ownerId === userId);
  const site = owned.find(s => s.type === 'Residential' && s.batteryKWh >= 10 && s.status === 'normal') ?? owned[0] ?? sites[0];
  if (!site) throw new Error('No saved installation is available for this account.');
  return site;
}