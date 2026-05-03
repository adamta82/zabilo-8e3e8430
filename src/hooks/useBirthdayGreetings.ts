import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BirthdayGreeting {
  id: string;
  recipient_id: string;
  sender_id: string;
  message: string;
  emoji: string | null;
  birthday_date: string;
  created_at: string;
  sender?: { full_name: string } | null;
}

export function useBirthdayGreetings(recipientId: string | undefined, dateStr: string | undefined) {
  return useQuery({
    queryKey: ['birthday-greetings', recipientId, dateStr],
    enabled: !!recipientId && !!dateStr,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('birthday_greetings' as any)
        .select('*')
        .eq('recipient_id', recipientId!)
        .eq('birthday_date', dateStr!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data || []) as any[];
      // Fetch sender names
      const senderIds = Array.from(new Set(list.map((g) => g.sender_id)));
      let senderMap = new Map<string, string>();
      if (senderIds.length) {
        const { data: senders } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', senderIds);
        senderMap = new Map((senders || []).map((s: any) => [s.user_id, s.full_name]));
      }
      return list.map((g) => ({
        ...g,
        sender: { full_name: senderMap.get(g.sender_id) || 'משתמש' },
      })) as BirthdayGreeting[];
    },
  });
}

export function useSendBirthdayGreeting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { recipient_id: string; birthday_date: string; message: string; emoji?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error('יש להתחבר');
      const { error } = await supabase.from('birthday_greetings' as any).insert({
        recipient_id: input.recipient_id,
        sender_id: user.id,
        message: input.message.trim().slice(0, 500),
        emoji: input.emoji || null,
        birthday_date: input.birthday_date,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['birthday-greetings', vars.recipient_id, vars.birthday_date] });
      toast({ title: 'הברכה נשלחה!', description: 'מזל טוב 🎉' });
    },
    onError: (err: any) => {
      toast({ title: 'שגיאה בשליחת הברכה', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBirthdayGreeting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('birthday_greetings' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['birthday-greetings'] });
      toast({ title: 'הברכה נמחקה' });
    },
  });
}
