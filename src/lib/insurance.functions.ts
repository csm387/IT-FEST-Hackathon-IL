import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Claim, Policy } from './insurance';

export interface PolicyInput extends Omit<Policy, 'id'> { id?: string }
export interface ClaimInput extends Omit<Claim, 'id'> { id?: string }

export const savePolicy = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PolicyInput) => input)
  .handler(async ({ data, context }) => {
    const row = {
      site_id: data.siteId, provider: data.provider, policy_number: data.policyNumber, insurance_type: data.insuranceType,
      start_date: data.startDate, end_date: data.endDate, insured_amount: data.insuredAmount, premium_annual: data.premiumAnnual,
      deductible: data.deductible, covered_equipment: data.coveredEquipment, covered_risks: data.coveredRisks, documents: data.documents,
    };
    const query = data.id
      ? context.supabase.from('insurance_policies').update(row).eq('id', data.id).select('id').single()
      : context.supabase.from('insurance_policies').insert({ ...row, created_by: context.userId }).select('id').single();
    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    return saved;
  });

export const deletePolicy = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('insurance_policies').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
  });

export const saveClaim = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ClaimInput) => input)
  .handler(async ({ data, context }) => {
    const row = {
      site_id: data.siteId, policy_id: data.policyId, incident_date: data.incidentDate, incident_type: data.incidentType,
      description: data.description, affected_equipment: data.affectedEquipment, repair_cost: data.repairCost,
      lost_energy_kwh: data.lostEnergyKwh, financial_loss: data.financialLoss, status: data.status, attachments: data.attachments,
    };
    const query = data.id
      ? context.supabase.from('insurance_claims').update(row).eq('id', data.id).select('id').single()
      : context.supabase.from('insurance_claims').insert({ ...row, created_by: context.userId }).select('id').single();
    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    return saved;
  });

export const deleteClaim = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('insurance_claims').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
  });
