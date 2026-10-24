import { describe, expect, it } from 'vitest';
import { currentPolicy, daysRemaining, dueReminders, fleetKpis, policyStatus, type Policy } from '@/lib/insurance';

const policy = (over: Partial<Policy> = {}): Policy => ({
  id: 'p1', siteId: 's1', provider: 'Allianz', policyNumber: 'RO-1', insuranceType: 'All-risk',
  startDate: '2026-01-01', endDate: '2027-01-01', insuredAmount: 50000, premiumAnnual: 1200, deductible: 500,
  coveredEquipment: ['panels'], coveredRisks: ['storm'], documents: [], ...over,
});

describe('insurance rules', () => {
  it('counts whole days until expiration', () => {
    expect(daysRemaining('2026-11-23', '2026-10-24')).toBe(30);
    expect(daysRemaining('2026-10-24', '2026-10-24')).toBe(0);
    expect(daysRemaining('2026-10-23', '2026-10-24')).toBe(-1);
  });

  it('classifies status: active over 30 days, expiring within 30, expired past end, none without policy', () => {
    expect(policyStatus(policy({ endDate: '2026-12-31' }), '2026-10-24')).toBe('active');
    expect(policyStatus(policy({ endDate: '2026-11-23' }), '2026-10-24')).toBe('expiring');
    expect(policyStatus(policy({ endDate: '2026-10-24' }), '2026-10-24')).toBe('expiring');
    expect(policyStatus(policy({ endDate: '2026-10-23' }), '2026-10-24')).toBe('expired');
    expect(policyStatus(null, '2026-10-24')).toBe('none');
  });

  it('schedules reminders exactly at 30/14/7/1/0 days with stable dedupe keys', () => {
    const at = (days: number) => dueReminders(policy({ endDate: '2026-12-01' }), '2026-11-01'.slice(0, 8) + String(1 + (30 - days)).padStart(2, '0'));
    expect(at(30)).toEqual([{ key: 'insurance-p1-30', daysLeft: 30 }]);
    expect(dueReminders(policy({ endDate: '2026-10-31' }), '2026-10-24')).toEqual([{ key: 'insurance-p1-7', daysLeft: 7 }]);
    expect(dueReminders(policy({ endDate: '2026-10-24' }), '2026-10-24')).toEqual([{ key: 'insurance-p1-0', daysLeft: 0 }]);
    expect(dueReminders(policy({ endDate: '2026-11-10' }), '2026-10-24')).toEqual([]);
    expect(dueReminders(policy({ endDate: '2026-10-20' }), '2026-10-24')).toEqual([]);
  });

  it('picks the policy expiring last as the current one', () => {
    const older = policy({ id: 'a', endDate: '2026-06-01' });
    const newer = policy({ id: 'b', endDate: '2027-06-01' });
    expect(currentPolicy([older, newer], 's1')?.id).toBe('b');
    expect(currentPolicy([policy({ siteId: 'other' })], 's1')).toBeNull();
  });

  it('aggregates fleet KPIs per installation with total insured value', () => {
    const policies = [
      policy({ id: 'a', siteId: 's1', endDate: '2027-06-01', insuredAmount: 10000 }),
      policy({ id: 'b', siteId: 's2', endDate: '2026-11-01', insuredAmount: 20000 }),
      policy({ id: 'c', siteId: 's3', endDate: '2026-09-01', insuredAmount: 30000 }),
    ];
    expect(fleetKpis(['s1', 's2', 's3', 's4'], policies, '2026-10-24')).toEqual({
      insured: 3, active: 1, expiring: 1, expired: 1, uninsured: 1, totalInsuredValue: 60000,
    });
  });
});
