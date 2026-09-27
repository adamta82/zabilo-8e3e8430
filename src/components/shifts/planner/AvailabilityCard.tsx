import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftSlots } from '@/hooks/useShiftPlanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { parseLocalDate, shortDate } from '@/lib/shift-planner';

export interface AvailabilityRow {
  user_id: string;
  date: string;
  status: string;
  note: string | null;
  slots: string[];
}

export function useAvailability(start: string, end: string) {
  return useQuery({
    queryKey: ['shift_availability', start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_availability')
        .select('user_id, date, status, note, slots')
        .gte('date', start)
        .lte('date', end);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...(r as AvailabilityRow), slots: (r.slots as string[]) ?? [] }));
    },
  });
}

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function AvailabilityCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: slots = [] } = useShiftSlots();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() + ((7 - weekStart.getDay()) % 7 || 7));
  const start = isoDate(weekStart);
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  const { data: availability = [] } = useAvailability(start, isoDate(endDate));

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingDay, setSavingDay] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const rowFor = (iso: string) => availability.find((a) => a.date === iso && a.user_id === user?.id);

  const save = async (iso: string, patch: { status?: 'available' | 'unavailable'; slots?: string[]; note?: string | null }) => {
    if (!user) return;
    setSavingDay(iso);
    const existing = rowFor(iso);
    const nextSlots = patch.slots ?? existing?.slots ?? [];
    const status = patch.status ?? (existing?.status as 'available' | 'unavailable' | undefined) ?? 'available';
    const note = patch.note !== undefined ? patch.note : (existing?.note ?? null);

    if (status === 'available' && nextSlots.length === 0 && !note) {
      // nothing left to remember — remove the row
      if (existing) await supabase.from('shift_availability').delete().match({ user_id: user.id, date: iso });
      setSavingDay(null);
      queryClient.invalidateQueries({ queryKey: ['shift_availability'] });
      return;
    }

    await supabase.from('shift_availability').upsert(
      { user_id: user.id, date: iso, status, slots: nextSlots, note },
      { onConflict: 'user_id,date' }
    );
    setSavingDay(null);
    queryClient.invalidateQueries({ queryKey: ['shift_availability'] });
  };

  const toggleSlot = (iso: string, slotId: string) => {
    const row = rowFor(iso);
    const current = row?.slots ?? [];
    const rowUnavailable = row?.status === 'unavailable';
    const next = rowUnavailable
      ? [slotId]
      : current.includes(slotId)
        ? current.filter((s) => s !== slotId)
        : [...current, slotId];
    save(iso, { slots: next, status: next.length ? 'available' : undefined });
  };

  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const dayName = (d: Date) => dayNames[d.getDay()];
  const timers: Record<string, ReturnType<typeof setTimeout>> = {};

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">הזמינות שלי לשבוע הקרוב</CardTitle>
        <p className="text-xs text-muted-foreground">
          סמנו את השעות שבהן תוכלו לעבוד. אפשר לסמן כמה שעות בכל יום.
        </p>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {days.map((d) => {
          const iso = isoDate(d);
          const row = rowFor(iso);
          const marked = row?.slots ?? [];
          const unavailable = row?.status === 'unavailable';
          const note = noteDrafts[iso] ?? row?.note ?? '';
          return (
            <div
              key={iso}
              className={cn(
                'rounded-lg border p-2 transition-colors',
                unavailable && 'bg-destructive/5',
                marked.length > 0 && !unavailable && 'bg-success/5'
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-1">
                <div className="text-sm font-medium">
                  יום {dayName(d)}
                  <span className="ms-1 text-[10px] font-normal text-muted-foreground">
                    {shortDate(parseLocalDate(iso), 'he-IL')}
                  </span>
                </div>
                <button
                  type="button"
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                    unavailable
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  )}
                  onClick={() =>
                    unavailable
                      ? save(iso, { slots: [], note: null }) // clearing an "unavailable" day resets it
                      : save(iso, { status: 'unavailable', slots: [] })
                  }
                >
                  {unavailable ? 'לא יכול/ה ✓' : 'לא יכול/ה'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {slots.map((s) => {
                  const on = !unavailable && marked.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={savingDay === iso}
                      onClick={() => toggleSlot(iso, s.id)}
                      className={cn(
                        'rounded border px-1.5 py-0.5 text-[10px] transition-colors',
                        on
                          ? 'border-success bg-success text-success-foreground'
                          : 'border-border bg-background text-muted-foreground hover:border-success/60 hover:text-foreground'
                      )}
                    >
                      {s.start_time.slice(0, 5)}
                    </button>
                  );
                })}
              </div>
              <Input
                value={note}
                onChange={(e) => {
                  const val = e.target.value;
                  setNoteDrafts((p) => ({ ...p, [iso]: val }));
                  clearTimeout(timers[iso]);
                  timers[iso] = setTimeout(() => save(iso, { note: val || null }), 600);
                }}
                placeholder="הערה (לא חובה)…"
                className="mt-1.5 h-7 border-dashed text-[11px]"
              />
              <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => save(iso, { status: 'available', slots: slots.map((s) => s.id) })}
                >
                  בחר הכל
                </button>
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => save(iso, { slots: [], note: null })}
                >
                  נקה
                </button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
