import { createContext, useContext, type ReactNode } from 'react';
import { useQueryClient, useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadWorkspace } from '@/lib/workspace.functions';
import { workspaceHome, type Workspace } from '@/lib/workspace';
import type { Account } from '@/lib/account';
import type { Job } from '@/lib/dispatch';
import type { Alert } from '@/lib/fleet';

export const workspaceQuery = (userId: string) => queryOptions({ queryKey: ['workspace', userId], queryFn: () => loadWorkspace(), staleTime: 30_000 });
interface WorkspaceContext extends Workspace {
  home: Workspace['sites'][number];
  saveJob: (id: string, job: Job) => Promise<void>;
  saveAlert: (id: string, patch: Partial<Alert>) => Promise<void>;
}
const Context = createContext<WorkspaceContext | null>(null);
export function WorkspaceProvider({ account, children }: { account: Account; children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(workspaceQuery(account.userId));
  async function refresh() { await queryClient.invalidateQueries({ queryKey: ['workspace', account.userId] }); }
  const saveJob = async (id: string, job: Job) => {
    const { data: saved, error } = await supabase.from('dispatch_jobs').update({ status: job.status, crew_id: job.crewId }).eq('id', id).select('id').single();
    if (error || !saved) { toast.error(error?.message ?? 'Assignment could not be saved'); return; }
    await refresh();
    toast.success('Intervention saved');
  };
  const saveAlert = async (id: string, patch: Partial<Alert>) => {
    const { error } = await supabase.from('site_alerts').update({ status: patch.status, technician: patch.technician }).eq('id', id).select('id').single();
    if (error) { toast.error(error.message); return; }
    await refresh();
  };
  return <Context.Provider value={{ ...data, home: workspaceHome(data.sites, account.userId), saveJob, saveAlert }}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('Workspace provider is missing');
  return value;
}