import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Shift {
  id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftWithEmployee extends Shift {
  profiles: {
    id: string;
    full_name: string;
    department_id: string | null;
    avatar_url: string | null;
  } | null;
}

export function useShifts(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['shifts', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('shifts')
        .select('*')
        .order('date')
        .order('start_time');

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data: rawShifts, error } = await query;
      if (error) throw error;

      // Planner shifts from locked days
      let lq = supabase.from('shift_day_locks').select('day');
      if (startDate) lq = lq.gte('day', startDate);
      if (endDate) lq = lq.lte('day', endDate);
      const { data: locks } = await lq;
      const lockedDays = (locks || []).map((l) => l.day as string);
      const plannerShifts: Shift[] = [];
      if (lockedDays.length) {
        const [{ data: cells }, { data: slots }, { data: roles }] = await Promise.all([
          supabase.from('shift_cells').select('date, employee_id, slot_id, role_id').in('date', lockedDays),
          supabase.from('shift_slots').select('id, start_time, end_time, sort_order').order('sort_order'),
          supabase.from('shift_roles').select('id, is_off'),
        ]);
        const working = new Set((roles || []).filter((r) => !r.is_off).map((r) => r.id));
        const byKey = new Map<string, Set<string>>();
        (cells || []).forEach((c) => {
          if (!working.has(c.role_id)) return;
          const k = `${c.date}|${c.employee_id}`;
          if (!byKey.has(k)) byKey.set(k, new Set());
          byKey.get(k)!.add(c.slot_id);
        });
        byKey.forEach((slotIds, k) => {
          const [date, employee_id] = k.split('|');
          let cur: Shift | null = null;
          (slots || []).forEach((sl) => {
            if (slotIds.has(sl.id)) {
              if (cur && cur.end_time === sl.start_time) cur.end_time = sl.end_time;
              else {
                if (cur) plannerShifts.push(cur);
                cur = { id: `planner-${k}-${sl.id}`, employee_id, date, start_time: sl.start_time, end_time: sl.end_time, created_at: '', updated_at: '' };
              }
            }
          });
          if (cur) plannerShifts.push(cur);
        });
      }
      const shifts = [...(rawShifts || []), ...plannerShifts].sort((a, b) =>
        a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)
      );
      if (shifts.length === 0) return [];

      // Fetch profiles for employees
      const empIds = [...new Set(shifts.map(s => s.employee_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, department_id, avatar_url')
        .in('id', empIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return shifts.map(s => ({
        ...s,
        profiles: profileMap.get(s.employee_id) || null,
      })) as ShiftWithEmployee[];
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (shift: { employee_id: string; date: string; start_time: string; end_time: string }) => {
      const { data, error } = await supabase
        .from('shifts')
        .insert(shift)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'המשמרת נשמרה בהצלחה' });
    },
    onError: (error) => {
      toast({ title: 'שגיאה בשמירת המשמרת', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, start_time, end_time }: { id: string; start_time: string; end_time: string }) => {
      const { error } = await supabase
        .from('shifts')
        .update({ start_time, end_time })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'המשמרת עודכנה' });
    },
    onError: (error) => {
      toast({ title: 'שגיאה בעדכון המשמרת', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'המשמרת נמחקה' });
    },
    onError: (error) => {
      toast({ title: 'שגיאה במחיקת המשמרת', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkCreateShifts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (shifts: { employee_id: string; date: string; start_time: string; end_time: string }[]) => {
      const { error } = await supabase
        .from('shifts')
        .insert(shifts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'המשמרות נשמרו בהצלחה' });
    },
    onError: (error) => {
      toast({ title: 'שגיאה בשמירת המשמרות', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkDeleteShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}
