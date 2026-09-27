import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftSlots, useShiftAvailability } from '@/hooks/useShiftPlanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { parseLocalDate, nextSunday, shortDate } from '@/lib/shift-planner';

export function AvailabilityCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: slots = [] } = useShiftSlots();
  const { data: availability = [] } = useShiftAvailability();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingDay, setSavingDay] = useState<string | null>(null);

  const today = new Date();
  const weekStart = nextSunday(today);
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
    const nextSlots = patch.slots ?? (existing?.slots as string[] | undefined) ?? [];
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
    const current = ((row?.slots as string[] | undefined) ?? []);
    const rowUnavailable = (row?.status as string | undefined) === 'unavailable';
    let next: string[];
    if (rowUnavailable) {
      next = [slotId];
    } else {
      next = current.includes(slotId) ? current.filter((s) => s !== slotId) : [...current, slotId];
    }
    save(iso, { slots: next, status: next.length ? 'available' : undefined });
  };

  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const dayName = (d: Date) => dayNames[d.getDay()];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">הזמינות שלי לשבוע הקרוב</CardTitle>
        <p className="text-xs text-muted-foreground">
          סמנו את שעות העבודה שבהן תוכלו. ניתן לסמן מספר שעות בכל יום.
        </p>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {days.map((d) => {
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const row = rowFor(iso);
          const marked = (row?.slots as string[] | undefined) ?? [];
          const unavailable = (row?.status as string | undefined) === 'unavailable';
          const note = noteDrafts[iso] ?? row?.note ?? '';
          return (
            <div
              key={iso}
              className={cn(
                'rounded-lg border p-2 transition-colors',
                unavailable && 'bg-destructive/5',
                marked.length > 0 && 'bg-success/5'
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-1">
                <div className="text-sm font-medium">
                  יום {dayName(d)}
                  <span className="ms-1 text-[10px] text-muted-foreground">{shortDate(parseLocalDate(iso), 'he-IL')}</span>
                </div>
                <button
                  type="button"
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                    unavailable ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                  )}
                  onClick={() => save(iso, unavailable ? { status: undefined as never, slots: [] } : { status: 'unavailable', slots: [] })}
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
                          : 'border-border bg-background text-muted-foreground hover:border-success/50'
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
                  setNoteDrafts((p) => ({ ...p, [iso]: e.target.value }));
                  clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>)[`availNote_${iso}`]);
                  (window as unknown as Record<string, ReturnType<typeof setTimeout>>)[`availNote_${iso}`] = setTimeout(() => save(iso, { note: e.target.value || null }), 600);
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
