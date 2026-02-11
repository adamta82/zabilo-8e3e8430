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

      const { data: shifts, error } = await query;
      if (error) throw error;
      if (!shifts || shifts.length === 0) return [];

      // Fetch profiles for employees
      const empIds = [...new Set(shifts.map(s => s.employee_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, department_id, avatar_url')
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
