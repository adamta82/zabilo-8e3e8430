import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminClockEvent {
  id: string;
  user_id: string;
  type: 'in' | 'out';
  method: 'qr' | 'nfc' | 'manual' | 'wfh';
  event_time: string;
  notes: string | null;
  is_approved: boolean;
  profile?: { id: string; full_name: string; avatar_url: string | null; department_id: string | null } | null;
}

/** Latest event per user, joined with profile, in given time range. */
export function useAllClockEvents(fromIso?: string, toIso?: string) {
  return useQuery({
    queryKey: ['admin-clock-events', fromIso, toIso],
    queryFn: async () => {
      let q = supabase
        .from('clock_events' as any)
        .select('*')
        .order('event_time', { ascending: false })
        .limit(500);
      if (fromIso) q = q.gte('event_time', fromIso);
      if (toIso) q = q.lte('event_time', toIso);
      const { data, error } = await q;
      if (error) throw error;
      const events = (data || []) as any[];
      if (events.length === 0) return [] as AdminClockEvent[];

      const userIds = [...new Set(events.map((e) => e.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, department_id')
        .in('user_id', userIds);
      const byUserId = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return events.map((e) => ({
        ...e,
        profile: byUserId.get(e.user_id) || null,
      })) as AdminClockEvent[];
    },
  });
}

/** Returns latest event per user (current status). */
export function useLatestEventPerUser() {
  return useQuery({
    queryKey: ['latest-event-per-user'],
    queryFn: async () => {
      // Pull last 14 days, then dedupe latest per user (cheaper than RPC).
      const fourteen = new Date();
      fourteen.setDate(fourteen.getDate() - 14);
      const { data, error } = await supabase
        .from('clock_events' as any)
        .select('*')
        .gte('event_time', fourteen.toISOString())
        .order('event_time', { ascending: false })
        .limit(2000);
      if (error) throw error;
      const events = (data || []) as any[];

      const seen = new Set<string>();
      const latest: any[] = [];
      for (const e of events) {
        if (seen.has(e.user_id)) continue;
        seen.add(e.user_id);
        latest.push(e);
      }

      const userIds = latest.map((e) => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, department_id')
        .in('user_id', userIds);
      const byUserId = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return latest.map((e) => ({ ...e, profile: byUserId.get(e.user_id) || null })) as AdminClockEvent[];
    },
  });
}

export function useUpdateAttendanceSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { id: string; patch: Record<string, any> }) => {
      const { error } = await supabase
        .from('attendance_settings' as any)
        .update(params.patch as any)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-settings'] });
      toast({ title: 'ההגדרות נשמרו' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}
