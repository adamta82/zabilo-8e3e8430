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
  location_id: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  profile?: { id: string; full_name: string; avatar_url: string | null; department_id: string | null } | null;
  location?: { id: string; name: string; address: string | null } | null;
}

async function joinProfilesAndLocations(events: any[]): Promise<AdminClockEvent[]> {
  if (events.length === 0) return [];
  const userIds = [...new Set(events.map((e) => e.user_id))];
  const locIds = [...new Set(events.map((e) => e.location_id).filter(Boolean))] as string[];
  const [{ data: profiles }, { data: locations }] = await Promise.all([
    supabase.from('profiles').select('id, user_id, full_name, avatar_url, department_id').in('user_id', userIds),
    locIds.length
      ? supabase.from('locations' as any).select('id, name, address').in('id', locIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const byUserId = new Map(profiles?.map((p) => [p.user_id, p]) || []);
  const byLocId = new Map(((locations as any) || []).map((l: any) => [l.id, l]));
  return events.map((e) => ({
    ...e,
    profile: byUserId.get(e.user_id) || null,
    location: e.location_id ? byLocId.get(e.location_id) || null : null,
  })) as AdminClockEvent[];
}

export function useAllClockEvents(fromIso?: string, toIso?: string) {
  return useQuery({
    queryKey: ['admin-clock-events', fromIso, toIso],
    queryFn: async () => {
      let q = supabase
        .from('clock_events' as any)
        .select('*')
        .order('event_time', { ascending: false })
        .limit(1000);
      if (fromIso) q = q.gte('event_time', fromIso);
      if (toIso) q = q.lte('event_time', toIso);
      const { data, error } = await q;
      if (error) throw error;
      return joinProfilesAndLocations((data as any) || []);
    },
  });
}

export function useLatestEventPerUser() {
  return useQuery({
    queryKey: ['latest-event-per-user'],
    queryFn: async () => {
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
      return joinProfilesAndLocations(latest);
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

// --- Locations CRUD ---
export interface Location {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  geofence_radius: number;
  qr_secret: string;
  nfc_tag_id: string | null;
  is_active: boolean;
}

export function useAdminLocations() {
  return useQuery({
    queryKey: ['admin-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return ((data as any) || []) as Location[];
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (params: { name: string; address?: string; lat?: number; lng?: number; geofence_radius?: number }) => {
      const { error, data } = await supabase
        .from('locations' as any)
        .insert(params as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-locations'] });
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'המיקום נוצר' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Location> }) => {
      const { error } = await supabase.from('locations' as any).update(patch as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-locations'] });
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'המיקום עודכן' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('locations' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-locations'] });
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'המיקום נמחק' });
    },
    onError: (e: any) => toast({ title: 'שגיאה', description: e.message, variant: 'destructive' }),
  });
}
