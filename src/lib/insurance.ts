// Pure insurance rules: status, expiry math and reminder scheduling.
// No database or UI access here — pages and providers feed rows in.

export interface Policy {
  id: string;
  siteId: string;
  provider: string;
  policyNumber: string;
  insuranceType: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  insuredAmount: number; // RON
  premiumAnnual: number; // RON
  deductible: number; // RON
  coveredEquipment: string[];
  coveredRisks: string[];
  documents: { name: string; path: string }[];
}

export type ClaimStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Closed';
export const CLAIM_STATUSES: ClaimStatus[] = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Closed'];

export interface Claim {
  id: string;
  siteId: string;
  policyId: string | null;
  incidentDate: string;
  incidentType: string;
  description: string;
  affectedEquipment: string[];
  repairCost: number; // RON
  lostEnergyKwh: number;
  financialLoss: number; // RON
  status: ClaimStatus;
  attachments: { name: string; path: string }[];
}

export type InsuranceStatus = 'active' | 'expiring' | 'expired' | 'none';
export const EXPIRING_DAYS = 30;

const DAY = 86400000;
const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** Whole days from `today` until `end` (negative once expired). */
export function daysRemaining(endDate: string, today: string): number {
  return Math.round((dayMs(endDate) - dayMs(today)) / DAY);
}

export function policyStatus(policy: Policy | null | undefined, today: string): InsuranceStatus {
  if (!policy) return 'none';
  const days = daysRemaining(policy.endDate, today);
  if (days < 0) return 'expired';
  if (days <= EXPIRING_DAYS) return 'expiring';
  return 'active';
}

export const STATUS_LABEL: Record<InsuranceStatus, string> = {
  active: 'Active',
  expiring: 'Expiring soon',
  expired: 'Expired',
  none: 'Not insured',
};

/** Reminder thresholds in days before expiration, plus the expiration day itself. */
export const REMINDER_DAYS = [30, 14, 7, 1, 0] as const;

/**
 * Reminders due today for a policy. Returns one entry per crossed threshold,
 * each with a stable dedupe key so the same reminder is never sent twice.
 */
export function dueReminders(policy: Policy, today: string): { key: string; daysLeft: number }[] {
  const days = daysRemaining(policy.endDate, today);
  return REMINDER_DAYS.filter((d) => days === d).map((d) => ({
    key: `insurance-${policy.id}-${d}`,
    daysLeft: d,
  }));
}

/** Pick the policy that matters for an installation: the one expiring last. */
export function currentPolicy(policies: Policy[], siteId: string): Policy | null {
  const own = policies.filter((p) => p.siteId === siteId);
  if (own.length === 0) return null;
  return own.reduce((a, b) => (dayMs(a.endDate) >= dayMs(b.endDate) ? a : b));
}

export interface FleetInsuranceKpis {
  insured: number;
  active: number;
  expiring: number;
  expired: number;
  uninsured: number;
  totalInsuredValue: number;
}

export function fleetKpis(siteIds: string[], policies: Policy[], today: string): FleetInsuranceKpis {
  const kpis: FleetInsuranceKpis = { insured: 0, active: 0, expiring: 0, expired: 0, uninsured: 0, totalInsuredValue: 0 };
  for (const id of siteIds) {
    const p = currentPolicy(policies, id);
    const st = policyStatus(p, today);
    if (st === 'none') kpis.uninsured++;
    else {
      kpis.insured++;
      kpis.totalInsuredValue += p!.insuredAmount;
      if (st === 'active') kpis.active++;
      else if (st === 'expiring') kpis.expiring++;
      else kpis.expired++;
    }
  }
  return kpis;
}
