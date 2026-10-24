REVOKE EXECUTE ON FUNCTION public.apply_account_type(uuid,public.account_type,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_account_type(uuid,public.account_type,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.can_read_site(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_site(uuid) TO authenticated,service_role;