CREATE TABLE public.energy_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('inverter','meter')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  pv_kwh numeric,
  import_kwh numeric,
  export_kwh numeric,
  battery_charge_kwh numeric,
  battery_discharge_kwh numeric,
  consumption_kwh numeric,
  boundary text NOT NULL DEFAULT 'ac' CHECK (boundary IN ('ac','dc')),
  battery_coupling text CHECK (battery_coupling IN ('none','ac','dc')),
  accuracy_pct numeric NOT NULL DEFAULT 1,
  timezone text NOT NULL DEFAULT 'Europe/Bucharest',
  synced_at timestamptz,
  origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('simulated','manual','csv','api')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, source, period_start, period_end)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energy_measurements TO authenticated;
GRANT ALL ON public.energy_measurements TO service_role;
ALTER TABLE public.energy_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read measurements on visible sites" ON public.energy_measurements FOR SELECT TO authenticated USING (public.can_read_site(site_id));
CREATE POLICY "Add measurements on visible sites" ON public.energy_measurements FOR INSERT TO authenticated WITH CHECK (public.can_read_site(site_id) AND created_by = auth.uid());
CREATE POLICY "Edit measurements on visible sites" ON public.energy_measurements FOR UPDATE TO authenticated USING (public.can_read_site(site_id)) WITH CHECK (public.can_read_site(site_id));
CREATE POLICY "Delete measurements on visible sites" ON public.energy_measurements FOR DELETE TO authenticated USING (public.can_read_site(site_id));

CREATE TABLE public.energy_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  supplier text NOT NULL DEFAULT '',
  meter_id text NOT NULL DEFAULT '',
  opening_import numeric, closing_import numeric,
  opening_export numeric, closing_export numeric,
  import_kwh numeric,
  export_kwh numeric,
  energy_price numeric,
  network_charges numeric,
  taxes numeric,
  export_compensation numeric,
  carried_credit_in numeric NOT NULL DEFAULT 0,
  carried_credit_out numeric,
  total_ron numeric,
  compensation_mode text NOT NULL DEFAULT 'quantity' CHECK (compensation_mode IN ('quantity','financial','none')),
  reading_type text NOT NULL DEFAULT 'actual' CHECK (reading_type IN ('actual','estimated')),
  origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('simulated','manual','upload')),
  document_path text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, period_start, period_end)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.energy_bills TO authenticated;
GRANT ALL ON public.energy_bills TO service_role;
ALTER TABLE public.energy_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read bills on visible sites" ON public.energy_bills FOR SELECT TO authenticated USING (public.can_read_site(site_id));
CREATE POLICY "Add bills on visible sites" ON public.energy_bills FOR INSERT TO authenticated WITH CHECK (public.can_read_site(site_id) AND created_by = auth.uid());
CREATE POLICY "Edit bills on visible sites" ON public.energy_bills FOR UPDATE TO authenticated USING (public.can_read_site(site_id)) WITH CHECK (public.can_read_site(site_id));
CREATE POLICY "Delete bills on visible sites" ON public.energy_bills FOR DELETE TO authenticated USING (public.can_read_site(site_id));

CREATE POLICY "Businesses create jobs on visible sites" ON public.dispatch_jobs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'business') AND public.can_read_site(site_id) AND crew_id IS NULL);

CREATE OR REPLACE FUNCTION public.seed_energy_demo(_site uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  s public.sites;
  yields int[] := ARRAY[45,65,100,125,145,150,160,145,110,75,45,35];
  kwp numeric; batt numeric; selfr numeric; home_key text;
  m int; ps date; pe date; y numeric;
  pv numeric; ch numeric; dis numeric; dir numeric; ex numeric; im numeric; cons numeric;
  inv_ex numeric; met_ex numeric; bill_ex numeric; reading text; credit numeric; total numeric;
  is_demo boolean;
BEGIN
  SELECT * INTO s FROM public.sites WHERE id = _site;
  IF s.id IS NULL THEN RETURN; END IF;
  SELECT data->>'homeKey' INTO home_key FROM public.simulation_templates WHERE id = 'gridpulse-v1';
  kwp := COALESCE((s.data->>'kWp')::numeric, 10);
  batt := COALESCE((s.data->>'batteryKWh')::numeric, 0);
  selfr := CASE s.data->>'type' WHEN 'Industrial' THEN 0.8 WHEN 'Commercial' THEN 0.7 ELSE 0.5 END;
  FOR m IN 4..9 LOOP
    ps := make_date(2026, m, 1);
    pe := (ps + interval '1 month' - interval '1 day')::date;
    is_demo := (m = 9 AND s.template_key = home_key);
    IF is_demo THEN
      pv := 650; ch := 0; dis := 0; ex := 280; im := 190; dir := 370; cons := 560;
      inv_ex := 280; met_ex := 280; bill_ex := 250; reading := 'actual';
    ELSE
      y := yields[m] * CASE WHEN s.data->>'status' IN ('under','critical') THEN 0.85 ELSE 1 END;
      pv := round(kwp * y);
      ch := CASE WHEN batt > 0 THEN round(least(pv * 0.18, batt * 0.8 * 30)) ELSE 0 END;
      dir := round(pv * selfr);
      ex := greatest(pv - dir - ch, 0);
      dis := round(ch * 0.9);
      im := round(pv * 0.3 + kwp * 8);
      cons := dir + dis + im;
      met_ex := round(ex * 0.996);
      inv_ex := CASE WHEN s.data->>'status' IN ('under','critical') THEN round(met_ex * 1.07) ELSE ex END;
      reading := CASE WHEN m = 8 AND (abs(hashtext(s.id::text)) % 4) = 0 THEN 'estimated' ELSE 'actual' END;
      bill_ex := CASE WHEN reading = 'estimated' THEN round(met_ex * 0.95) ELSE met_ex END;
    END IF;
    INSERT INTO public.energy_measurements(site_id, source, period_start, period_end, pv_kwh, import_kwh, export_kwh, battery_charge_kwh, battery_discharge_kwh, consumption_kwh, boundary, battery_coupling, accuracy_pct, synced_at, origin, created_by)
    VALUES (_site, 'inverter', ps, pe, pv, im, inv_ex, ch, dis, cons, 'ac', CASE WHEN batt > 0 THEN 'ac' ELSE 'none' END, 3, pe + interval '1 day 2 hours', 'simulated', s.owner_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.energy_measurements(site_id, source, period_start, period_end, import_kwh, export_kwh, accuracy_pct, synced_at, origin, created_by)
    VALUES (_site, 'meter', ps, pe, im, met_ex, 1, pe + interval '3 days', 'simulated', s.owner_id)
    ON CONFLICT DO NOTHING;
    credit := greatest(bill_ex - im, 0);
    total := round((greatest(im - bill_ex, 0) * 1.30 + im * 0.35) * 1.19, 2);
    INSERT INTO public.energy_bills(site_id, period_start, period_end, supplier, meter_id, import_kwh, export_kwh, energy_price, network_charges, taxes, export_compensation, carried_credit_in, carried_credit_out, total_ron, compensation_mode, reading_type, origin, created_by)
    VALUES (_site, ps, pe, 'Demo Energie SA (simulated)', 'RO-DEMO-' || upper(substr(md5(_site::text), 1, 6)), im, bill_ex, 1.30, round(im * 0.35, 2),
      round((greatest(im - bill_ex, 0) * 1.30 + im * 0.35) * 0.19, 2), round(least(bill_ex, im) * 1.30, 2), 0, credit, total,
      CASE WHEN kwp <= 400 THEN 'quantity' ELSE 'financial' END, reading, 'simulated', s.owner_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.seed_energy_demo(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.seed_energy_demo_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.seed_energy_demo(NEW.id); RETURN NEW; END $$;
REVOKE EXECUTE ON FUNCTION public.seed_energy_demo_trigger() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER seed_energy_demo AFTER INSERT ON public.sites FOR EACH ROW WHEN (NEW.template_key IS NOT NULL) EXECUTE FUNCTION public.seed_energy_demo_trigger();