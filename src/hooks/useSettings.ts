import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface WebhookSettings {
  url: string;
  enabled: boolean;
}

export function useWebhookSettings() {
  return useQuery({
    queryKey: ['settings', 'webhook'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'webhook_url')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        return data.value as unknown as WebhookSettings;
      }

      return { url: '', enabled: false };
    },
  });
}

export function useSaveWebhookSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: WebhookSettings) => {
      const { error } = await supabase
        .from('global_settings')
        .upsert(
          {
            key: 'webhook_url',
            value: settings as unknown as Json,
          },
          { onConflict: 'key' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'webhook'] });
      toast({
        title: 'ההגדרות נשמרו בהצלחה',
      });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה בשמירת ההגדרות',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useTestWebhook() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (url: string) => {
      const response = await supabase.functions.invoke('send-webhook', {
        body: {
          event: 'test',
          test_url: url,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'הבדיקה הצליחה!',
        description: 'ה-Webhook מגיב כצפוי',
      });
    },
    onError: (error) => {
      toast({
        title: 'הבדיקה נכשלה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
