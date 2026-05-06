import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { captureGpsSilently } from '@/lib/gps';

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
  gps_accuracy: number | null;
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

export function useMyClockEvents(limit = 100) {
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

/** Events for the user in a date range (used by monthly view) */
export function useMyEventsInRange(fromIso: string, toIso: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-events-range', user?.id, fromIso, toIso],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clock_events' as any)
        .select('*')
        .eq('user_id', user!.id)
        .gte('event_time', fromIso)
        .lte('event_time', toIso)
        .order('event_time', { ascending: true });
      if (error) throw error;
      return ((data as any) || []) as ClockEvent[];
    },
  });
}

/** Admin: events for a specific user in a date range */
export function useUserEventsInRange(userId: string | null, fromIso: string, toIso: string) {
  return useQuery({
    queryKey: ['user-events-range', userId, fromIso, toIso],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clock_events' as any)
        .select('*')
        .eq('user_id', userId!)
        .gte('event_time', fromIso)
        .lte('event_time', toIso)
        .order('event_time', { ascending: true });
      if (error) throw error;
      return ((data as any) || []) as ClockEvent[];
    },
  });
}

/** Admin: insert a clock event for any user with audit log */
export function useAdminInsertEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { user_id: string; type: ClockEventType; event_time: string; notes?: string | null; reason?: string }) => {
      const { data, error } = await supabase.from('clock_events' as any).insert({
        user_id: params.user_id, type: params.type, method: 'manual',
        event_time: params.event_time, notes: params.notes ?? null,
        is_correction: true,
        last_edited_by: user!.id, last_edited_at: new Date().toISOString(),
      } as any).select().single();
      if (error) throw error;
      await supabase.from('clock_event_edits' as any).insert({
        event_id: (data as any).id, user_id: params.user_id, edited_by: user!.id,
        action: 'create',
        new_values: { event_time: params.event_time, notes: params.notes, type: params.type },
        reason: params.reason ?? 'הוספה ע״י מנהל',
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-events-range'] });
      qc.invalidateQueries({ queryKey: ['admin-clock-events'] });
      toast({ title: 'נוסף דיווח' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

/** Admin: delete any clock event with audit log */
export function useAdminDeleteEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { id: string; reason?: string }) => {
      const { data: existing } = await supabase.from('clock_events' as any).select('*').eq('id', params.id).single();
      const old = existing as any;
      const { error } = await supabase.from('clock_events' as any).delete().eq('id', params.id);
      if (error) throw error;
      if (old) {
        await supabase.from('clock_event_edits' as any).insert({
          event_id: params.id, user_id: old.user_id, edited_by: user!.id,
          action: 'delete', old_values: { event_time: old.event_time, notes: old.notes, type: old.type },
          reason: params.reason ?? 'מחיקה ע״י מנהל',
        } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-events-range'] });
      qc.invalidateQueries({ queryKey: ['admin-clock-events'] });
      toast({ title: 'הרשומה נמחקה' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

/** Update an event's time/notes with audit logging */
export function useUpdateClockEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { id: string; event_time?: string; notes?: string | null; reason?: string }) => {
      const { data: existing, error: fetchErr } = await supabase
        .from('clock_events' as any).select('*').eq('id', params.id).single();
      if (fetchErr) throw fetchErr;
      const old = existing as any;
      const next: any = { last_edited_by: user!.id, last_edited_at: new Date().toISOString(),
        edit_count: (old.edit_count || 0) + 1 };
      if (params.event_time) next.event_time = params.event_time;
      if (params.notes !== undefined) next.notes = params.notes;
      const { error } = await supabase.from('clock_events' as any).update(next).eq('id', params.id);
      if (error) throw error;
      await supabase.from('clock_event_edits' as any).insert({
        event_id: params.id, user_id: old.user_id, edited_by: user!.id, action: 'update',
        old_values: { event_time: old.event_time, notes: old.notes },
        new_values: { event_time: next.event_time ?? old.event_time, notes: next.notes ?? old.notes },
        reason: params.reason ?? null,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-events-range'] });
      qc.invalidateQueries({ queryKey: ['my-clock-events'] });
      qc.invalidateQueries({ queryKey: ['clock-status'] });
      toast({ title: 'הרשומה עודכנה' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

/** Insert a correction event (manager-requested) with audit log */
export function useInsertCorrectionEvent() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: {
      type: ClockEventType; event_time: string; notes?: string | null;
      correction_request_id?: string | null;
    }) => {
      const { data, error } = await supabase.from('clock_events' as any).insert({
        user_id: user!.id, type: params.type, method: 'manual',
        event_time: params.event_time, notes: params.notes ?? null,
        is_correction: true, correction_request_id: params.correction_request_id ?? null,
        last_edited_by: user!.id, last_edited_at: new Date().toISOString(),
      } as any).select().single();
      if (error) throw error;
      await supabase.from('clock_event_edits' as any).insert({
        event_id: (data as any).id, user_id: user!.id, edited_by: user!.id,
        action: 'create', new_values: { event_time: params.event_time, notes: params.notes, type: params.type },
        reason: 'תיקון חודשי',
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-events-range'] });
      qc.invalidateQueries({ queryKey: ['my-clock-events'] });
      toast({ title: 'נוסף דיווח תיקון' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

async function insertEvent(params: {
  user_id: string;
  type: ClockEventType;
  method: ClockEventMethod;
  event_time?: string;
  notes?: string | null;
  location_id?: string | null;
  captureGps?: boolean;
}) {
  let gps: { lat: number; lng: number; accuracy: number } | null = null;
  if (params.captureGps !== false && params.method !== 'manual') {
    gps = await captureGpsSilently();
  }
  const { error, data } = await supabase
    .from('clock_events' as any)
    .insert({
      user_id: params.user_id,
      type: params.type,
      method: params.method,
      event_time: params.event_time || new Date().toISOString(),
      notes: params.notes ?? null,
      location_id: params.location_id ?? null,
      gps_lat: gps?.lat ?? null,
      gps_lng: gps?.lng ?? null,
      gps_accuracy: gps?.accuracy ?? null,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
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
    }) => insertEvent({ user_id: user!.id, type: 'in', ...params }),
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
      location_id?: string | null;
    }) => insertEvent({ user_id: user!.id, type: 'out', ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clock-status'] });
      qc.invalidateQueries({ queryKey: ['my-clock-events'] });
      toast({ title: 'נרשמה יציאה מהעבודה' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

/** Scan a static QR (location id). If currently in → clock out, else → clock in. */
export function useQrToggle() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (locationId: string) => {
      // Get current status
      const { data: latest } = await supabase
        .from('clock_events' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('event_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      const currentlyIn = (latest as any)?.type === 'in';
      return insertEvent({
        user_id: user!.id,
        type: currentlyIn ? 'out' : 'in',
        method: 'qr',
        location_id: locationId,
      });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['clock-status'] });
      qc.invalidateQueries({ queryKey: ['my-clock-events'] });
      toast({
        title: data?.type === 'in' ? 'נרשמה כניסה (QR)' : 'נרשמה יציאה (QR)',
      });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

/** Delete a single event. */
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

/** Delete a session (1 or 2 events: in + out). */
export function useDeleteSession() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('clock_events' as any).delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clock-status'] });
      qc.invalidateQueries({ queryKey: ['my-clock-events'] });
      toast({ title: 'הסשן נמחק' });
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

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return ((data as any) || []) as any[];
    },
  });
}
