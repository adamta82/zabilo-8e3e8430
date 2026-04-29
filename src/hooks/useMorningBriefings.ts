import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

      const { data, error } = await supabase.functions.invoke('process-briefing', {
        body: {
          briefingDate,
          audioPath,
          rawTranscript: rawTranscript ?? null,
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
