import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches approved WFH dates within a date range.
 * Returns a Map of profile.id -> Set of date strings (yyyy-MM-dd) where the employee works from home.
 */
export function useWfhDates(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['wfh-dates', startDate, endDate],
    queryFn: async () => {
      const map = new Map<string, Set<string>>();
      if (!startDate || !endDate) return map;

      const { data: requests, error } = await supabase
        .from('requests')
        .select('user_id, wfh_date')
        .eq('type', 'wfh')
        .eq('status', 'approved')
        .gte('wfh_date', startDate)
        .lte('wfh_date', endDate);

      if (error) throw error;
      if (!requests?.length) return map;

      const userIds = [...new Set(requests.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id')
        .in('user_id', userIds);

      const userToProfile = new Map(profiles?.map((p) => [p.user_id, p.id]) || []);

      requests.forEach((r) => {
        const pid = userToProfile.get(r.user_id);
        if (!pid || !r.wfh_date) return;
        if (!map.has(pid)) map.set(pid, new Set());
        map.get(pid)!.add(r.wfh_date);
      });

      return map;
    },
    enabled: !!startDate && !!endDate,
  });
}
