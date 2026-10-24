import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { siteDay } from '@/lib/fleet';
import { shouldNotifySurplus } from '@/lib/energy';
import { dueReminders } from '@/lib/insurance';
import { useWorkspace } from './WorkspaceProvider';
import { useSavedSetting } from '@/hooks/use-saved-setting';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type Priority = 'info' | 'opportunity' | 'warning' | 'critical';
export interface Note { id: string; title: string; body: string; priority: Priority; time: string; read: boolean; kind: 'actual' | 'forecast' | 'system'; key: string }
export interface Prefs { surplus: boolean; battery: boolean; peak: boolean; faults: boolean; insurance: boolean; push: boolean; quietStart: number; quietEnd: number; thresholdKW: number }
const defaultPrefs: Prefs = { surplus: true, battery: true, peak: true, faults: true, insurance: true, push: false, quietStart: 22, quietEnd: 7, thresholdKW: 2 };
interface Ctx { notes: Note[]; prefs: Prefs; setPrefs: (p: Prefs) => void; markAll: () => void; markRead: (id: string) => void; push: (n: Omit<Note, 'id' | 'time' | 'read'>) => void; unread: number }
const NotificationsCtx = createContext<Ctx | null>(null);

export function NotificationsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { home, sites, policies } = useWorkspace();
  const client = useQueryClient();
  const queryKey = useMemo(() => ['notifications', userId], [userId]);
  const [prefs, setPrefs] = useSavedSetting(userId, 'prefs', defaultPrefs);
  const lastByKey = useRef<Record<string, number>>({});
  const { data: notes = [] } = useQuery({ queryKey, queryFn: async () => {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(row => ({ ...(row.data as unknown as Note), id: row.id, read: row.read }));
  } });
  const mark = async (id?: string) => {
    let query = supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    if (id) query = query.eq('id', id);
    const { error } = await query;
    if (error) { toast.error(error.message); return; }
    await client.invalidateQueries({ queryKey });
  };
  const push = useCallback((note: Omit<Note, 'id' | 'time' | 'read'>) => {
    const now = Date.now();
    const last = lastByKey.current[note.key] ?? 0;
    if (now - last < 3600000) return;
    lastByKey.current[note.key] = now;
    const time = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    void (async () => {
      const { error } = await supabase.from('notifications').insert({ user_id: userId, data: { ...note, time } as Json });
      if (error) { toast.error(error.message); return; }
      await client.invalidateQueries({ queryKey });
      toast(note.title, { description: note.body });
      if (prefs.push && typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(note.title, { body: note.body });
    })();
  }, [userId, prefs.push, client, queryKey]);
  useEffect(() => {
    const id = setInterval(() => {
      const hour = new Date().getHours();
      const quiet = prefs.quietStart > prefs.quietEnd ? hour >= prefs.quietStart || hour < prefs.quietEnd : hour >= prefs.quietStart && hour < prefs.quietEnd;
      const point = siteDay(home)[hour];
      if (!point) return;
      const surplus = point.solar - point.load;
      if (prefs.surplus && shouldNotifySurplus(surplus, (Date.now() - (lastByKey.current['surplus-live'] ?? 0)) / 60000, quiet, prefs.thresholdKW)) push({ key: 'surplus-live', kind: 'actual', priority: 'opportunity', title: 'High solar surplus · simulation', body: `Saved sample shows about ${surplus.toFixed(1)} kW surplus.` });
    }, 45000);
    return () => clearInterval(id);
  }, [prefs, push, home]);
  // Insurance expiry reminders: checked on load and daily; each threshold sends once per policy.
  useEffect(() => {
    if (!prefs.insurance) return;
    const check = () => {
      const today = new Date().toISOString().slice(0, 10);
      for (const policy of policies) {
        const site = sites.find(s => s.id === policy.siteId);
        for (const r of dueReminders(policy, today)) {
          push({
            key: r.key, kind: 'system', priority: r.daysLeft <= 7 ? 'warning' : 'info',
            title: r.daysLeft === 0 ? '🛡️ Insurance expires today' : '🛡️ Insurance expiring soon',
            body: r.daysLeft === 0
              ? `The insurance policy for ${site?.name ?? 'your installation'} in ${site?.city ?? ''} expires today. Renew it to avoid a coverage gap.`
              : `Your solar installation ${site?.name ?? ''} in ${site?.city ?? ''} has ${r.daysLeft} days remaining on its insurance policy. Renew it to avoid a potential coverage gap.`,
          });
        }
      }
    };
    check();
    const id = setInterval(check, 6 * 3600000);
    return () => clearInterval(id);
  }, [prefs.insurance, policies, sites, push]);
  return <NotificationsCtx.Provider value={{ notes, prefs, setPrefs, push, unread: notes.filter(n => !n.read).length, markAll: () => { void mark(); }, markRead: id => { void mark(id); } }}>{children}</NotificationsCtx.Provider>;
}
export function useNotifications() {
  const context = useContext(NotificationsCtx);
  if (!context) throw new Error('useNotifications outside provider');
  return context;
}
