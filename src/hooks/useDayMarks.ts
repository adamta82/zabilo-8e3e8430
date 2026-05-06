import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type DayMarkType = 'vacation' | 'sick' | 'absent' | 'reserve' | 'other';

export interface DayMark {
  id: string;
  user_id: string;
  date: string;
  type: DayMarkType;
  note: string | null;
  correction_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export const DAY_MARK_LABELS: Record<DayMarkType, string> = {
  vacation: 'חופש',
  sick: 'מחלה',
  absent: 'לא עבד',
  reserve: 'מילואים',
  other: 'אחר',
};

export function useMyDayMarks(fromIso: string, toIso: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['day-marks', user?.id, fromIso, toIso],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_marks' as any)
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', fromIso)
        .lte('date', toIso);
      if (error) throw error;
      return ((data as any) || []) as DayMark[];
    },
  });
}

export function useUpsertDayMark() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      date: string;
      type: DayMarkType;
      note?: string | null;
      correction_request_id?: string | null;
    }) => {
      const { error } = await supabase
        .from('day_marks' as any)
        .upsert(
          {
            user_id: user!.id,
            created_by: user!.id,
            date: params.date,
            type: params.type,
            note: params.note ?? null,
            correction_request_id: params.correction_request_id ?? null,
          } as any,
          { onConflict: 'user_id,date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['day-marks'] });
      toast({ title: 'הסימון נשמר' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteDayMark() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('day_marks' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['day-marks'] });
      toast({ title: 'הסימון נמחק' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

// ===== Month correction requests =====
export interface MonthCorrectionRequest {
  id: string;
  user_id: string;
  year: number;
  month: number;
  status: 'open' | 'completed';
  message: string | null;
  requested_by: string;
  requested_at: string;
  completed_at: string | null;
}

export function useMyOpenCorrections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-corrections', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('month_correction_requests' as any)
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'open')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return ((data as any) || []) as MonthCorrectionRequest[];
    },
  });
}

export function useCompleteCorrection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('month_correction_requests' as any)
        .update({ status: 'completed', completed_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-corrections'] });
      toast({ title: 'הבקשה סומנה כהושלמה' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

export function useRequestMonthCorrections() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { user_id: string; year: number; month: number; message?: string }) => {
      const { error } = await supabase
        .from('month_correction_requests' as any)
        .upsert(
          {
            user_id: params.user_id,
            year: params.year,
            month: params.month,
            message: params.message ?? null,
            requested_by: user!.id,
            status: 'open',
          } as any,
          { onConflict: 'user_id,year,month' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-corrections'] });
      qc.invalidateQueries({ queryKey: ['admin-corrections'] });
      toast({ title: 'נשלחה לעובד בקשת תיקונים' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

// ===== Audit log helper =====
export async function logClockEdit(params: {
  event_id: string;
  user_id: string;
  edited_by: string;
  action: 'create' | 'update' | 'delete';
  old_values?: any;
  new_values?: any;
  reason?: string;
}) {
  await supabase.from('clock_event_edits' as any).insert(params as any);
}

export function useEventEdits(eventIds: string[]) {
  return useQuery({
    queryKey: ['clock-event-edits', eventIds.sort().join(',')],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clock_event_edits' as any)
        .select('*')
        .in('event_id', eventIds)
        .order('edited_at', { ascending: false });
      if (error) throw error;
      return ((data as any) || []) as any[];
    },
  });
}
