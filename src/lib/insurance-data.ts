import { supabase } from '@/integrations/supabase/client';
import type { Claim, Policy } from './insurance';

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Please sign in again.');
  return id;
}

export interface PolicyInput extends Omit<Policy, 'id'> { id?: string }
export interface ClaimInput extends Omit<Claim, 'id'> { id?: string }

export async function savePolicy({ data }: { data: PolicyInput }) {
    const context = { supabase, userId: await currentUserId() };
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
}

export async function deletePolicy({ data }: { data: { id: string } }) {
    const context = { supabase, userId: await currentUserId() };
    const { error } = await context.supabase.from('insurance_policies').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
}

export async function saveClaim({ data }: { data: ClaimInput }) {
    const context = { supabase, userId: await currentUserId() };
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
}

export async function deleteClaim({ data }: { data: { id: string } }) {
    const context = { supabase, userId: await currentUserId() };
    const { error } = await context.supabase.from('insurance_claims').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
}
