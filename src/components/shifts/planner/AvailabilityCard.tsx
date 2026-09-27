import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addDaysTo, isoDate, parseLocalDate, shortDate, sundayOf } from '@/lib/shift-planner';

export type AvailabilityStatus = 'available' | 'unavailable';
export interface AvailabilityRow {
  user_id: string;
  date: string;
  status: AvailabilityStatus;
  note: string | null;
}

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function useAvailability(start: string, end: string) {
  return useQuery({
    queryKey: ['shift_availability', start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_availability' as never)
        .select('user_id, date, status, note')
        .gte('date', start)
        .lte('date', end);
      if (error) throw error;
      return (data || []) as unknown as AvailabilityRow[];
    },
  });
}

export function AvailabilityCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const dates = useMemo(() => {
    const s = addDaysTo(sundayOf(new Date()), 7);
    return Array.from({ length: 7 }, (_, i) => isoDate(addDaysTo(s, i)));
  }, []);
  const { data = [] } = useAvailability(dates[0], dates[6]);
  const mine = new Map(data.filter((r) => r.user_id === user?.id).map((r) => [r.date, r]));

  const save = useMutation({
    mutationFn: async ({ date, status, note }: { date: string; status: AvailabilityStatus | null; note: string | null }) => {
      if (!user) return;
      const tbl = supabase.from('shift_availability' as never);
      if (!status) {
        const { error } = await tbl.delete().eq('user_id', user.id).eq('date', date);
        if (error) throw error;
      } else {
        const { error } = await (tbl as any).upsert(
          { user_id: user.id, date, status, note },
          { onConflict: 'user_id,date' }
        );
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift_availability'] }),
    onError: (e: Error) => toast({ title: 'שגיאה בשמירה', description: e.message, variant: 'destructive' }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">הזמינות שלי לשבוע הבא</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {dates.map((d, i) => {
          const row = mine.get(d);
          const set = (status: AvailabilityStatus) =>
            save.mutate({ date: d, status: row?.status === status ? null : status, note: row?.note ?? null });
          return (
            <div key={d} className="space-y-2 rounded-md border border-border p-2">
              <div className="text-xs font-semibold">
                {DAYS[i]} · {shortDate(parseLocalDate(d), 'he-IL')}
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => set('available')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs',
                    row?.status === 'available' ? 'border-success bg-success/15 text-success' : 'border-border text-muted-foreground'
                  )}
                >
                  <Check className="h-3.5 w-3.5" /> רוצה לעבוד
                </button>
                <button
                  type="button"
                  onClick={() => set('unavailable')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs',
                    row?.status === 'unavailable' ? 'border-destructive bg-destructive/15 text-destructive' : 'border-border text-muted-foreground'
                  )}
                >
                  <X className="h-3.5 w-3.5" /> לא יכול/ה
                </button>
              </div>
              {row && (
                <Input
                  key={`${d}-${row.note ?? ''}`}
                  defaultValue={row.note ?? ''}
                  placeholder="הערה (למשל: רק עד 14:00)"
                  className="h-8 text-xs"
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null;
                    if (v !== row.note) save.mutate({ date: d, status: row.status, note: v });
                  }}
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
