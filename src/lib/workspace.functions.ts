import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { nextMaintenanceDate } from './maintenance';
import type { StoredSite, Workspace } from './workspace';
import type { Crew, Job } from './dispatch';
import type { Alert } from './fleet';

export const loadWorkspace = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Workspace> => {
    const [sites, crews, jobs, alerts] = await Promise.all([
      context.supabase.from('sites').select('*').order('template_key'),
      context.supabase.from('crews').select('*').order('template_key'),
      context.supabase.from('dispatch_jobs').select('*').order('reference'),
      context.supabase.from('site_alerts').select('*').order('reference'),
    ]);
    for (const result of [sites, crews, jobs, alerts]) if (result.error) throw new Error(result.error.message);
    const mapped = (sites.data ?? []).map(row => ({ ...(row.data as unknown as StoredSite), id: row.id, ownerId: row.owner_id }));
    return {
      sites: mapped,
      crews: (crews.data ?? []).map(row => ({ ...(row.data as unknown as Crew), id: row.id })),
      jobs: (jobs.data ?? []).map(row => ({ id: row.id, reference: row.reference, siteId: row.site_id, title: row.title, priority: row.priority as Job['priority'], status: row.status as Job['status'], crewId: row.crew_id })),
      alerts: (alerts.data ?? []).map(row => ({ ...(row.data as unknown as Alert), id: row.id, siteId: row.site_id, status: row.status as Alert['status'], technician: row.technician })),
      maintenance: (sites.data ?? []).flatMap(row => {
        const site = mapped.find(s => s.id === row.id);
        return site ? [{ site, panelManufacturer: row.panel_manufacturer, last: row.last_maintenance, next: nextMaintenanceDate(row.last_maintenance ?? site.installDate, row.maintenance_months), basis: row.last_maintenance ? 'maintenance' as const : 'installation' as const }] : [];
      }),
    };
  });