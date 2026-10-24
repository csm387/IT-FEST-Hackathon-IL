import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRef } from 'react';
import type { Json } from '@/integrations/supabase/types';

export function useSavedSetting<T>(userId: string, key: string, fallback: T): [T, (value: T) => void] {
  const client = useQueryClient();
  const chain = useRef(Promise.resolve());
  const queryKey = ['settings', userId];
  const { data } = useQuery({ queryKey, queryFn: async () => {
    const { data, error } = await supabase.from('account_settings').select('data').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return (data?.data ?? {}) as Record<string, Json>;
  } });
  const save = (value: T) => {
    client.setQueryData(queryKey, (previous: Record<string, Json> | undefined) => ({ ...previous, [key]: value as Json }));
    chain.current = chain.current.then(async () => {
      const { data: existing, error: readError } = await supabase.from('account_settings').select('data').eq('user_id', userId).maybeSingle();
      if (readError) throw readError;
      const { error } = await supabase.from('account_settings').upsert({ user_id: userId, data: { ...(existing?.data as Record<string, Json> ?? {}), [key]: value as Json } });
      if (error) throw error;
    }).catch(error => { toast.error(error instanceof Error ? error.message : 'Settings could not be saved'); void client.invalidateQueries({ queryKey }); });
  };
  return [(data?.[key] as T | undefined) ?? fallback, save];
}