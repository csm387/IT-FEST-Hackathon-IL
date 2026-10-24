import { describe, expect, it } from 'vitest';
import { workspaceHome, type StoredSite } from '@/lib/workspace';
import { siteDay } from '@/lib/fleet';

const own = { id: 'own', ownerId: 'individual', type: 'Residential', batteryKWh: 10, status: 'normal', readings: [[{ hour: 13, solar: 4.2 }]] } as unknown as StoredSite;
const company = { ...own, id: 'company', ownerId: 'business' };
describe('saved account data', () => {
  it('selects the individual account installation instead of another owner', () => expect(workspaceHome([company, own], 'individual').id).toBe('own'));
  it('reads persisted hourly values instead of regenerating simulation', () => expect(siteDay(own)[0].solar).toBe(4.2));
  it('does not invent installations for an empty account', () => expect(() => workspaceHome([], 'individual')).toThrow());
});