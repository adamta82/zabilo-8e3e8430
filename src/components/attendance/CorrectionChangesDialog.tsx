import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { DAY_MARK_LABELS, DayMarkType } from '@/hooks/useDayMarks';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  correctionRequestId: string;
  employeeName: string;
  monthLabel: string;
}

interface ChangeRow {
  date: string;
  kind: 'edit' | 'create' | 'delete' | 'mark';
  before?: string;
  after?: string;
  detail?: string;
  at: string;
}

function fmtTime(iso: string | null | undefined) {
  return iso ? format(parseISO(iso), 'HH:mm') : '—';
}

export function CorrectionChangesDialog({ open, onOpenChange, correctionRequestId, employeeName, monthLabel }: Props) {
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ['correction-changes', correctionRequestId],
    enabled: open && !!correctionRequestId,
    queryFn: async (): Promise<ChangeRow[]> => {
      // Get the correction request to know user/range
      const { data: req } = await supabase
        .from('month_correction_requests' as any)
        .select('*').eq('id', correctionRequestId).single();
      const r = req as any;
      if (!r) return [];

      // 1) New events created via this correction request
      const { data: newEvents } = await supabase
        .from('clock_events' as any)
        .select('*')
        .eq('correction_request_id', correctionRequestId);

      // 2) Day marks attached to this correction
      const { data: marks } = await supabase
        .from('day_marks' as any)
        .select('*')
        .eq('correction_request_id', correctionRequestId);

      // 3) Edits performed by the employee since request was created
      const monthStart = new Date(r.year, r.month - 1, 1).toISOString();
      const monthEnd = new Date(r.year, r.month, 0, 23, 59, 59).toISOString();
      const { data: monthEvents } = await supabase
        .from('clock_events' as any)
        .select('id')
        .eq('user_id', r.user_id)
        .gte('event_time', monthStart)
        .lte('event_time', monthEnd);
      const eventIds = ((monthEvents as any) || []).map((e: any) => e.id);
      let edits: any[] = [];
      if (eventIds.length > 0) {
        const { data: e } = await supabase
          .from('clock_event_edits' as any)
          .select('*')
          .in('event_id', eventIds)
          .eq('edited_by', r.user_id)
          .gte('edited_at', r.requested_at);
        edits = (e as any) || [];
      }

      const rows: ChangeRow[] = [];

      ((newEvents as any) || []).forEach((ev: any) => {
        rows.push({
          date: format(parseISO(ev.event_time), 'yyyy-MM-dd'),
          kind: 'create',
          after: `${ev.type === 'in' ? 'כניסה' : 'יציאה'} ${fmtTime(ev.event_time)}`,
          at: ev.created_at,
        });
      });

      ((marks as any) || []).forEach((m: any) => {
        rows.push({
          date: m.date,
          kind: 'mark',
          after: DAY_MARK_LABELS[m.type as DayMarkType] + (m.note ? ` (${m.note})` : ''),
          at: m.created_at,
        });
      });

      edits.forEach((ed: any) => {
        const oldT = ed.old_values?.event_time;
        const newT = ed.new_values?.event_time;
        rows.push({
          date: oldT ? format(parseISO(oldT), 'yyyy-MM-dd') : (newT ? format(parseISO(newT), 'yyyy-MM-dd') : ''),
          kind: ed.action,
          before: oldT ? fmtTime(oldT) : (ed.old_values?.notes || '—'),
          after: newT ? fmtTime(newT) : (ed.new_values?.notes || '—'),
          detail: ed.reason || undefined,
          at: ed.edited_at,
        });
      });

      rows.sort((a, b) => (a.date < b.date ? -1 : 1));
      return rows;
    },
  });

  const grouped = changes.reduce<Record<string, ChangeRow[]>>((acc, c) => {
    (acc[c.date] = acc[c.date] || []).push(c);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0">
          <DialogTitle>שינויים שביצע {employeeName} — {monthLabel}</DialogTitle>
          <DialogDescription>
            רשימת כל השינויים, ההוספות והסימונים שעודכנו ע״י העובד בעקבות בקשת התיקונים.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">טוען...</p>
          ) : changes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">העובד לא ביצע שינויים בפועל.</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(grouped).map(([date, rows]) => (
                <li key={date} className="border rounded-md p-3">
                  <div className="text-sm font-medium mb-2">
                    {format(parseISO(date), 'EEEE dd/MM/yyyy', { locale: he })}
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {rows.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 flex-wrap">
                        <Badge variant={c.kind === 'create' ? 'default' : c.kind === 'delete' ? 'destructive' : c.kind === 'mark' ? 'secondary' : 'outline'} className="text-[10px]">
                          {c.kind === 'create' ? 'נוסף' : c.kind === 'delete' ? 'נמחק' : c.kind === 'mark' ? 'סימון יום' : 'עריכה'}
                        </Badge>
                        {c.before !== undefined && (
                          <span className="text-muted-foreground line-through">{c.before}</span>
                        )}
                        {c.before !== undefined && c.after !== undefined && <span>→</span>}
                        {c.after !== undefined && <span className="font-medium">{c.after}</span>}
                        {c.detail && <span className="text-muted-foreground italic">— {c.detail}</span>}
                        <span className="text-muted-foreground/70 ms-auto text-[10px]">
                          {format(parseISO(c.at), 'HH:mm dd/MM', { locale: he })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter className="p-4 sm:p-6 pt-2 shrink-0 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>סגירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
