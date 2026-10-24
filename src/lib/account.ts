import { supabase } from "@/integrations/supabase/client";

export type AccountType = "individual" | "business";
export interface Account {
  userId: string;
  email: string;
  role: AccountType | null;
  fullName: string;
  companyName: string | null;
  inviteCode: string | null;
  companyId: string | null;
}

export async function loadAccount(): Promise<Account | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: r }, { data: p }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("full_name, company_name, invite_code, company_id").eq("id", user.id).maybeSingle(),
  ]);
  return {
    userId: user.id, email: user.email ?? "", role: (r?.role as AccountType) ?? null,
    fullName: p?.full_name ?? "", companyName: p?.company_name ?? null, inviteCode: p?.invite_code ?? null, companyId: p?.company_id ?? null,
  };
}

/** Paths only business accounts may open. */
export const BUSINESS_PATHS = ["/business", "/sites", "/operations"];
export function isBusinessPath(path: string) {
  return BUSINESS_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}
export function canOpen(role: AccountType, path: string) {
  // Detail records are protected by ownership RLS, while fleet lists stay business-only.
  if (role === 'individual' && /^\/sites\/[^/]+\/?$/.test(path)) return true;
  return role === "business" || !isBusinessPath(path);
}
