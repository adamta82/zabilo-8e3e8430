import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type ClockEventType = 'in' | 'out';
export type ClockEventMethod = 'qr' | 'nfc' | 'manual' | 'wfh';

export interface ClockEvent {
  id: string;
  user_id: string;
  type: ClockEventType;
  method: ClockEventMethod;
  event_time: string;
  location_id: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  outside_geofence: boolean;
  notes: string | null;
  is_approved: boolean;
  created_at: string;
}

export function useCurrentClockStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['clock-status', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clock_events' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('event_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as ClockEvent | null;
    },
  });
}

export function useMyClockEvents(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-clock-events', user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clock_events' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('event_time', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data as any) || []) as ClockEvent[];
    },
  });
}

export function useClockIn() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      method: ClockEventMethod;
      event_time?: string;
      notes?: string | null;
      location_id?: string | null;
      gps_lat?: number | null;
      gps_lng?: number | null;
    }) => {
      const { error, data } = await supabase
        .from('clock_events' as any)
        .insert({
          user_id: user!.id,
          type: 'in',
          method: params.method,
          event_time: params.event_time || new Date().toISOString(),
          notes: params.notes ?? null,
          location_id: params.location_id ?? null,
          gps_lat: params.gps_lat ?? null,
          gps_lng: params.gps_lng ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clock-status'] });
      qc.invalidateQueries({ queryKey: ['my-clock-events'] });
      toast({ title: 'נרשמה כניסה לעבודה' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      method: ClockEventMethod;
      event_time?: string;
      notes?: string | null;
    }) => {
      const { error, data } = await supabase
        .from('clock_events' as any)
        .insert({
          user_id: user!.id,
          type: 'out',
          method: params.method,
          event_time: params.event_time || new Date().toISOString(),
          notes: params.notes ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clock-status'] });
      qc.invalidateQueries({ queryKey: ['my-clock-events'] });
      toast({ title: 'נרשמה יציאה מהעבודה' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteClockEvent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clock_events' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clock-status'] });
      qc.invalidateQueries({ queryKey: ['my-clock-events'] });
      toast({ title: 'הרשומה נמחקה' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

export function useAttendanceSettings() {
  return useQuery({
    queryKey: ['attendance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_settings' as any)
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}
