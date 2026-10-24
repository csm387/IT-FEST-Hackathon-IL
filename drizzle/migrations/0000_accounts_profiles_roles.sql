CREATE TYPE public.account_type AS ENUM ('individual', 'business');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.account_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  company_name text,
  invite_code text UNIQUE,
  company_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.account_type)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Businesses read their clients" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = auth.uid() AND public.has_role(auth.uid(), 'business'));
CREATE POLICY "Clients read their company" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Protect columns users must not edit directly
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.invite_code := OLD.invite_code;
    NEW.company_id := OLD.company_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_protect BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

CREATE OR REPLACE FUNCTION public.gen_invite_code() RETURNS text LANGUAGE sql AS $$
  SELECT upper(substr(md5(gen_random_uuid()::text), 1, 8))
$$;

-- Assign account type once (signup metadata or onboarding)
CREATE OR REPLACE FUNCTION public.apply_account_type(_user uuid, _type public.account_type, _company text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user) THEN RETURN; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user, _type);
  IF _type = 'business' THEN
    UPDATE public.profiles SET company_name = NULLIF(trim(_company), ''), invite_code = public.gen_invite_code() WHERE id = _user;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text := NEW.raw_user_meta_data->>'account_type';
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  IF t IN ('individual', 'business') THEN
    PERFORM public.apply_account_type(NEW.id, t::public.account_type, NEW.raw_user_meta_data->>'company_name');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Onboarding (e.g. Google sign-up without type)
CREATE OR REPLACE FUNCTION public.choose_account_type(_type public.account_type, _company text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  PERFORM public.apply_account_type(auth.uid(), _type, _company);
END $$;

-- Individual links to a company by its invite code (or unlinks with NULL)
CREATE OR REPLACE FUNCTION public.link_company(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.profiles;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'individual') THEN RAISE EXCEPTION 'Only individual accounts can link a company'; END IF;
  IF _code IS NULL OR trim(_code) = '' THEN
    UPDATE public.profiles SET company_id = NULL WHERE id = auth.uid(); RETURN NULL;
  END IF;
  SELECT * INTO c FROM public.profiles WHERE invite_code = upper(trim(_code));
  IF c.id IS NULL THEN RAISE EXCEPTION 'Invalid company code'; END IF;
  UPDATE public.profiles SET company_id = c.id WHERE id = auth.uid();
  RETURN c.company_name;
END $$;

REVOKE EXECUTE ON FUNCTION public.apply_account_type(uuid, public.account_type, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.choose_account_type(public.account_type, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_company(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.account_type) TO authenticated;