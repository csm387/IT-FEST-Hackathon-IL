CREATE OR REPLACE FUNCTION public.provision_account_simulation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bundle jsonb;
  item jsonb;
  new_site uuid;
  mapped_site uuid;
  mapped_crew uuid;
  mapped_policy uuid;
  selected_key text;
BEGIN
  SELECT data INTO bundle FROM public.simulation_templates WHERE id = 'gridpulse-v1';
  IF bundle IS NULL THEN
    RETURN NEW;
  END IF;
  selected_key := bundle->>'homeKey';

  FOR item IN SELECT value FROM jsonb_array_elements(bundle->'sites') LOOP
    IF NEW.role = 'business' OR item->'site'->>'id' = selected_key THEN
      INSERT INTO public.sites(owner_id, template_key, data, last_maintenance, panel_manufacturer)
      VALUES (NEW.user_id, item->'site'->>'id', item->'site', NULLIF(item->>'last', '')::date, item->>'panelManufacturer')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  IF NEW.role = 'business' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(bundle->'crews') LOOP
      INSERT INTO public.crews(company_id, template_key, data)
      VALUES (NEW.user_id, item->>'id', item)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(bundle->'jobs') LOOP
    SELECT id INTO mapped_site FROM public.sites WHERE owner_id = NEW.user_id AND template_key = item->>'siteId';
    IF mapped_site IS NOT NULL THEN
      SELECT id INTO mapped_crew FROM public.crews WHERE company_id = NEW.user_id AND template_key = item->>'crewId';
      INSERT INTO public.dispatch_jobs(site_id, reference, title, priority, status, crew_id)
      VALUES (mapped_site, item->>'id', item->>'title', item->>'priority', CASE WHEN mapped_crew IS NULL THEN 'New' ELSE item->>'status' END, mapped_crew)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  FOR item IN SELECT value FROM jsonb_array_elements(bundle->'alerts') LOOP
    SELECT id INTO mapped_site FROM public.sites WHERE owner_id = NEW.user_id AND template_key = item->>'siteId';
    IF mapped_site IS NOT NULL THEN
      INSERT INTO public.site_alerts(site_id, reference, data, status, technician)
      VALUES (mapped_site, item->>'id', item, item->>'status', item->>'technician')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(bundle->'policies', '[]'::jsonb)) LOOP
    SELECT id INTO mapped_site FROM public.sites WHERE owner_id = NEW.user_id AND template_key = item->>'siteId';
    IF mapped_site IS NOT NULL THEN
      INSERT INTO public.insurance_policies(site_id, provider, policy_number, insurance_type, start_date, end_date, insured_amount, premium_annual, deductible, covered_equipment, covered_risks, created_by)
      VALUES (
        mapped_site, item->>'provider', item->>'policyNumber', item->>'insuranceType',
        (item->>'start')::date, (item->>'end')::date,
        (item->>'insuredAmount')::numeric, (item->>'premium')::numeric, (item->>'deductible')::numeric,
        ARRAY(SELECT jsonb_array_elements_text(item->'equipment')),
        ARRAY(SELECT jsonb_array_elements_text(item->'risks')),
        NEW.user_id
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(bundle->'claims', '[]'::jsonb)) LOOP
    SELECT id INTO mapped_site FROM public.sites WHERE owner_id = NEW.user_id AND template_key = item->>'siteId';
    IF mapped_site IS NOT NULL THEN
      SELECT id INTO mapped_policy FROM public.insurance_policies
      WHERE site_id = mapped_site AND policy_number = item->>'policyNumber';
      INSERT INTO public.insurance_claims(site_id, policy_id, incident_date, incident_type, description, affected_equipment, repair_cost, lost_energy_kwh, financial_loss, status, created_by)
      VALUES (
        mapped_site, mapped_policy, (item->>'incidentDate')::date, item->>'incidentType', COALESCE(item->>'description', ''),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'equipment', '[]'::jsonb))),
        COALESCE((item->>'repairCost')::numeric, 0), COALESCE((item->>'lostEnergyKwh')::numeric, 0), COALESCE((item->>'financialLoss')::numeric, 0),
        COALESCE(item->>'status', 'Draft'), NEW.user_id
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  INSERT INTO public.account_settings(user_id, data)
  VALUES (NEW.user_id, bundle->'settings')
  ON CONFLICT DO NOTHING;

  FOR item IN SELECT value FROM jsonb_array_elements(bundle->'notifications') LOOP
    INSERT INTO public.notifications(user_id, data, read)
    VALUES (NEW.user_id, item, COALESCE((item->>'read')::boolean, false));
  END LOOP;

  RETURN NEW;
END
$function$;