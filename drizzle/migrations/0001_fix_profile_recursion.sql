CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.my_company_id() TO authenticated;
DROP POLICY "Clients read their company" ON public.profiles;
CREATE POLICY "Clients read their company" ON public.profiles FOR SELECT TO authenticated USING (id = public.my_company_id());