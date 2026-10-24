CREATE TABLE public.insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  provider text NOT NULL,
  policy_number text NOT NULL,
  insurance_type text NOT NULL DEFAULT 'All-risk',
  start_date date NOT NULL,
  end_date date NOT NULL,
  insured_amount numeric NOT NULL DEFAULT 0,
  premium_annual numeric NOT NULL DEFAULT 0,
  deductible numeric NOT NULL DEFAULT 0,
  covered_equipment text[] NOT NULL DEFAULT '{}',
  covered_risks text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_policies TO authenticated;
GRANT ALL ON public.insurance_policies TO service_role;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read policies on visible sites" ON public.insurance_policies FOR SELECT TO authenticated USING (can_read_site(site_id));
CREATE POLICY "Owners and linked businesses add policies" ON public.insurance_policies FOR INSERT TO authenticated WITH CHECK (can_read_site(site_id) AND created_by = auth.uid());
CREATE POLICY "Owners and linked businesses edit policies" ON public.insurance_policies FOR UPDATE TO authenticated USING (can_read_site(site_id)) WITH CHECK (can_read_site(site_id));
CREATE POLICY "Owners and linked businesses delete policies" ON public.insurance_policies FOR DELETE TO authenticated USING (can_read_site(site_id));

CREATE TABLE public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
  incident_date date NOT NULL,
  incident_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  affected_equipment text[] NOT NULL DEFAULT '{}',
  repair_cost numeric NOT NULL DEFAULT 0,
  lost_energy_kwh numeric NOT NULL DEFAULT 0,
  financial_loss numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Draft',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_claims TO authenticated;
GRANT ALL ON public.insurance_claims TO service_role;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read claims on visible sites" ON public.insurance_claims FOR SELECT TO authenticated USING (can_read_site(site_id));
CREATE POLICY "Owners and linked businesses add claims" ON public.insurance_claims FOR INSERT TO authenticated WITH CHECK (can_read_site(site_id) AND created_by = auth.uid());
CREATE POLICY "Owners and linked businesses edit claims" ON public.insurance_claims FOR UPDATE TO authenticated USING (can_read_site(site_id)) WITH CHECK (can_read_site(site_id));
CREATE POLICY "Owners and linked businesses delete claims" ON public.insurance_claims FOR DELETE TO authenticated USING (can_read_site(site_id));