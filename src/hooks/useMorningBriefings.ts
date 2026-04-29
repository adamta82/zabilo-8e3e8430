import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BriefingSection {
  title: string;
  bullets: string[];
}

export interface BriefingAttendance {
  vacation: string[];
  wfh: string[];
}

export interface MorningBriefing {
  id: string;
  briefing_date: string;
  audio_path: string | null;
  raw_transcript: string | null;
  summary_sections: BriefingSection[] | null;
  attendance: BriefingAttendance | null;
  status: 'processing' | 'ready' | 'failed';
  created_by: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useLatestBriefing() {
  return useQuery({
    queryKey: ['morning-briefings', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('morning_briefings')
        .select('*')
        .eq('status', 'ready')
        .order('briefing_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MorningBriefing | null;
    },
  });
}

export function useBriefings() {
  return useQuery({
    queryKey: ['morning-briefings', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('morning_briefings')
        .select('*')
        .order('briefing_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as MorningBriefing[];
    },
  });
}

export function useBriefing(id: string | undefined) {
  return useQuery({
    queryKey: ['morning-briefings', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('morning_briefings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MorningBriefing | null;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as MorningBriefing | null;
      return data?.status === 'processing' ? 2000 : false;
    },
  });
}

interface CreateBriefingInput {
  briefingDate: string;
  audioBlob?: Blob;
  rawTranscript?: string;
}

export function useCreateBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ briefingDate, audioBlob, rawTranscript }: CreateBriefingInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('לא מחובר');

      let audioPath: string | null = null;
      if (audioBlob) {
        const ext = audioBlob.type.includes('mp3') ? 'mp3'
          : audioBlob.type.includes('m4a') ? 'm4a'
          : audioBlob.type.includes('wav') ? 'wav'
          : 'webm';
        audioPath = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('morning-briefings-audio')
          .upload(audioPath, audioBlob, { contentType: audioBlob.type, upsert: false });
        if (upErr) throw upErr;
      }

      const { data: briefing, error } = await supabase
        .from('morning_briefings')
        .insert({
          briefing_date: briefingDate,
          audio_path: audioPath,
          raw_transcript: rawTranscript ?? null,
          status: 'processing',
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Trigger processing
      const { error: fnErr } = await supabase.functions.invoke('process-briefing', {
        body: { briefingId: briefing.id },
      });
      if (fnErr) {
        // Don't throw - the briefing is created, we'll show its failed status
        console.error('Process briefing error:', fnErr);
      }

      return briefing as unknown as MorningBriefing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['morning-briefings'] });
      toast.success('התדריך נוצר ועובד כעת');
    },
    onError: (e: any) => {
      toast.error(e.message ?? 'שגיאה ביצירת התדריך');
    },
  });
}

export function useDeleteBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('morning_briefings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['morning-briefings'] });
      toast.success('התדריך נמחק');
    },
    onError: (e: any) => toast.error(e.message ?? 'שגיאה במחיקה'),
  });
}
