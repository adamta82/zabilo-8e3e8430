import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShiftPreset {
  label: string;
  start: string;
  end: string;
}

const DEFAULT_PRESETS: ShiftPreset[] = [
  { label: 'בוקר', start: '07:00', end: '12:00' },
  { label: 'בוקר+', start: '08:00', end: '13:00' },
  { label: 'יום מלא', start: '08:00', end: '17:00' },
  { label: 'אחה״צ', start: '13:00', end: '18:00' },
  { label: 'ערב', start: '16:00', end: '20:00' },
];

const SETTINGS_KEY = 'shift_presets';

export function useShiftPresets() {
  return useQuery({
    queryKey: ['shift-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', SETTINGS_KEY)
        .maybeSingle();

      if (error) throw error;
      if (data?.value && Array.isArray(data.value)) {
        return data.value as unknown as ShiftPreset[];
      }
      return DEFAULT_PRESETS;
    },
  });
}

export function useUpdateShiftPresets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (presets: ShiftPreset[]) => {
      // Upsert using the key
      const { data: existing } = await supabase
        .from('global_settings')
        .select('id')
        .eq('key', SETTINGS_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('global_settings')
          .update({ value: presets as any })
          .eq('key', SETTINGS_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('global_settings')
          .insert({ key: SETTINGS_KEY, value: presets as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-presets'] });
    },
  });
}
