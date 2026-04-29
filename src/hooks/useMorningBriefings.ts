import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export interface BriefingPreviewData {
  title: string;
  transcript: string;
  sections: BriefingSection[];
  attendance: BriefingAttendance;
  html: string;
  audioPath: string | null;
}

interface BaseBriefingInput {
  briefingDate: string;
  audioBlob?: Blob;
  rawTranscript?: string;
  audioPath?: string | null;
}

interface CreateBriefingInput extends BaseBriefingInput {
  previewData?: BriefingPreviewData;
}

async function getAuthenticatedUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('לא מחובר');
  return user;
}

async function uploadBriefingAudio(audioBlob: Blob, userId: string) {
  const ext = audioBlob.type.includes('mp3') ? 'mp3'
    : audioBlob.type.includes('m4a') ? 'm4a'
    : audioBlob.type.includes('wav') ? 'wav'
    : 'webm';
  const audioPath = `${userId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('morning-briefings-audio')
    .upload(audioPath, audioBlob, { contentType: audioBlob.type, upsert: false });

  if (upErr) throw upErr;
  return audioPath;
}

export function usePreviewBriefing() {
  return useMutation({
    mutationFn: async ({ briefingDate, audioBlob, rawTranscript, audioPath }: BaseBriefingInput) => {
      const user = await getAuthenticatedUser();

      const resolvedAudioPath = audioPath ?? (audioBlob ? await uploadBriefingAudio(audioBlob, user.id) : null);
      const { data, error } = await supabase.functions.invoke<BriefingPreviewData>('process-briefing', {
        body: {
          briefingDate,
          audioPath: resolvedAudioPath,
          rawTranscript: rawTranscript ?? null,
          previewOnly: true,
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (e: any) => {
      toast.error(e.message ?? 'שגיאה בהכנת התצוגה המקדימה');
    },
  });
}

export function useCreateBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ briefingDate, audioBlob, rawTranscript, audioPath, previewData }: CreateBriefingInput) => {
      const user = await getAuthenticatedUser();
      const resolvedAudioPath = audioPath ?? (audioBlob ? await uploadBriefingAudio(audioBlob, user.id) : null);

      const { data, error } = await supabase.functions.invoke('process-briefing', {
        body: {
          briefingDate,
          audioPath: resolvedAudioPath,
          rawTranscript: rawTranscript ?? null,
          previewData: previewData ?? null,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge_articles'] });
      qc.invalidateQueries({ queryKey: ['unread_count'] });
      toast.success('תדריך הבוקר נוצר ופורסם');
    },
    onError: (e: any) => {
      toast.error(e.message ?? 'שגיאה ביצירת התדריך');
    },
  });
}
