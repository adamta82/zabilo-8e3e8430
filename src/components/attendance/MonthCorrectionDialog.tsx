import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO,
  isSaturday, startOfDay, isAfter } from 'date-fns';
import { he } from 'date-fns/locale';
import { Edit2, Plus, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMyEventsInRange, useUpdateClockEvent, useInsertCorrectionEvent } from '@/hooks/useAttendance';
import { useMyDayMarks, useUpsertDayMark, useCompleteCorrection, DAY_MARK_LABELS, DayMarkType } from '@/hooks/useDayMarks';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  year: number;
  month: number;
  correctionRequestId: string;
}

export function MonthCorrectionDialog({ open, onOpenChange, year, month, correctionRequestId }: Props) {
  const monthRef = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(monthRef);
  const monthEnd = endOfMonth(monthRef);
  const today = startOfDay(new Date());

  const { data: events = [] } = useMyEventsInRange(monthStart.toISOString(), monthEnd.toISOString());
  const { data: marks = [] } = useMyDayMarks(format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'));
  const updateEvent = useUpdateClockEvent();
  const insertCorrection = useInsertCorrectionEvent();
  const upsertMark = useUpsertDayMark();
  const completeCorr = useCompleteCorrection();

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [inTime, setInTime] = useState('09:00');
  const [outTime, setOutTime] = useState('17:00');
  const [markType, setMarkType] = useState<DayMarkType>('vacation');
  const [markNote, setMarkNote] = useState('');
  const [changeLog, setChangeLog] = useState<Array<{ date: string; kind: 'hours' | 'mark'; before: string; after: string }>>([]);
  const [showPreview, setShowPreview] = useState(false);

  const dayData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return days.map((day) => {
      const dayEvents = events
        .filter((e) => isSameDay(parseISO(e.event_time), day))
        .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
      const inEv = dayEvents.find((e) => e.type === 'in');
      const outEv = dayEvents.find((e) => e.type === 'out');
      const mark = marks.find((m) => m.date === format(day, 'yyyy-MM-dd'));
      const isFuture = isAfter(day, today);
      const isSat = isSaturday(day);
      const missing = !isSat && !isFuture && !mark && dayEvents.length === 0;
      return { day, inEv, outEv, mark, isFuture, isSat, missing, hasAny: dayEvents.length > 0 };
    });
  }, [events, marks, monthStart, monthEnd, today]);

  const handleStartEdit = (d: typeof dayData[number]) => {
    const dateStr = format(d.day, 'yyyy-MM-dd');
    setEditingDate(dateStr);
    setInTime(d.inEv ? format(parseISO(d.inEv.event_time), 'HH:mm') : '09:00');
    setOutTime(d.outEv ? format(parseISO(d.outEv.event_time), 'HH:mm') : '17:00');
    setMarkType(d.mark?.type || 'vacation');
    setMarkNote(d.mark?.note || '');
  };

  const handleSaveHours = async (d: typeof dayData[number]) => {
    const dateStr = format(d.day, 'yyyy-MM-dd');
    const before = `${d.inEv ? format(parseISO(d.inEv.event_time), 'HH:mm') : '—'} ← ${d.outEv ? format(parseISO(d.outEv.event_time), 'HH:mm') : '—'}`;
    const after = `${inTime} ← ${outTime}`;
    const inIso = new Date(`${dateStr}T${inTime}:00`).toISOString();
    const outIso = new Date(`${dateStr}T${outTime}:00`).toISOString();
    if (d.inEv) {
      await updateEvent.mutateAsync({ id: d.inEv.id, event_time: inIso, reason: 'תיקון חודשי' });
    } else {
      await insertCorrection.mutateAsync({ type: 'in', event_time: inIso, correction_request_id: correctionRequestId });
    }
    if (d.outEv) {
      await updateEvent.mutateAsync({ id: d.outEv.id, event_time: outIso, reason: 'תיקון חודשי' });
    } else {
      await insertCorrection.mutateAsync({ type: 'out', event_time: outIso, correction_request_id: correctionRequestId });
    }
    setChangeLog((l) => [...l.filter((c) => !(c.date === dateStr && c.kind === 'hours')), { date: dateStr, kind: 'hours', before, after }]);
    setEditingDate(null);
  };

  const handleSaveMark = async (d: typeof dayData[number]) => {
    const dateStr = format(d.day, 'yyyy-MM-dd');
    const before = d.mark ? DAY_MARK_LABELS[d.mark.type] + (d.mark.note ? ` (${d.mark.note})` : '') : '—';
    const after = DAY_MARK_LABELS[markType] + (markNote ? ` (${markNote})` : '');
    await upsertMark.mutateAsync({
      date: dateStr, type: markType, note: markNote || null,
      correction_request_id: correctionRequestId,
    });
    setChangeLog((l) => [...l.filter((c) => !(c.date === dateStr && c.kind === 'mark')), { date: dateStr, kind: 'mark', before, after }]);
    setEditingDate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0">
          <DialogTitle>עדכון דיווחים — {format(monthRef, 'MMMM yyyy', { locale: he })}</DialogTitle>
          <DialogDescription>
            ימים בלי דיווח מודגשים באדום. ניתן לעדכן שעות, להוסיף דיווח חסר, או לסמן יום שלא עבדת.
            כל שינוי נשמר עם תיעוד מלא למנהל.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6">
          <ul className="divide-y">
            {dayData.map((d) => {
              const dateStr = format(d.day, 'yyyy-MM-dd');
              const isEditing = editingDate === dateStr;
              const dateLabel = format(d.day, 'EEEE dd/MM', { locale: he });
              return (
                <li key={dateStr}
                  className={`py-3 ${d.isSat ? 'bg-muted/40 -mx-6 px-6' : ''} ${d.isFuture ? 'opacity-40' : ''} ${d.missing ? 'bg-destructive/5 -mx-6 px-6' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {dateLabel}
                        {d.missing && <Badge variant="destructive" className="text-[10px]">חסר דיווח</Badge>}
                        {d.mark && <Badge variant="secondary" className="text-[10px]">{DAY_MARK_LABELS[d.mark.type]}</Badge>}
                      </div>
                      {!isEditing && d.hasAny && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {d.inEv ? format(parseISO(d.inEv.event_time), 'HH:mm') : '—'}
                          {' ← '}
                          {d.outEv ? format(parseISO(d.outEv.event_time), 'HH:mm') : '—'}
                        </div>
                      )}
                      {!isEditing && d.mark?.note && (
                        <div className="text-xs text-muted-foreground mt-0.5">{d.mark.note}</div>
                      )}
                    </div>
                    {!isEditing && !d.isSat && !d.isFuture && (
                      <Button size="sm" variant="ghost" onClick={() => handleStartEdit(d)}>
                        {d.hasAny || d.mark ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-3 space-y-3 bg-muted/30 p-3 rounded-md">
                      <div>
                        <Label className="text-xs">שעות עבודה</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">כניסה</Label>
                            <Input type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">יציאה</Label>
                            <Input type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} />
                          </div>
                        </div>
                        <Button size="sm" className="mt-2 w-full" onClick={() => handleSaveHours(d)}>
                          שמירת שעות
                        </Button>
                      </div>
                      <div className="border-t pt-3">
                        <Label className="text-xs">או סימון יום ללא עבודה</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <Select value={markType} onValueChange={(v) => setMarkType(v as DayMarkType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(DAY_MARK_LABELS) as DayMarkType[]).map((k) => (
                                <SelectItem key={k} value={k}>{DAY_MARK_LABELS[k]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input placeholder="הערה (אופציונלי)" value={markNote} onChange={(e) => setMarkNote(e.target.value)} />
                        </div>
                        <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={() => handleSaveMark(d)}>
                          שמירת סימון
                        </Button>
                      </div>
                      <Button size="sm" variant="ghost" className="w-full" onClick={() => setEditingDate(null)}>
                        ביטול
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 p-4 sm:p-6 pt-2 shrink-0 border-t">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            סגירה
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => setShowPreview(true)}>
            <Check className="ml-2 h-4 w-4" />
            סיימתי — תצוגה מקדימה
          </Button>
        </DialogFooter>

        {showPreview && (
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>אישור שליחה למנהל</DialogTitle>
                <DialogDescription>
                  להלן השינויים שביצעת במהלך עדכון החודש. אישור ישלח את הבקשה כסגורה למנהל.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[50vh] overflow-y-auto -mx-2 px-2">
                {changeLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">לא בוצעו שינויים בחודש זה.</p>
                ) : (
                  <ul className="space-y-2">
                    {changeLog.map((c, i) => (
                      <li key={i} className="border rounded-md p-2 text-sm">
                        <div className="font-medium">
                          {format(new Date(c.date), 'EEEE dd/MM', { locale: he })}
                          <Badge variant="outline" className="mr-2 text-[10px]">
                            {c.kind === 'hours' ? 'שעות' : 'סימון יום'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="line-through">{c.before}</span>
                          {' → '}
                          <span className="text-foreground font-medium">{c.after}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>חזרה לעריכה</Button>
                <Button onClick={async () => {
                  await completeCorr.mutateAsync(correctionRequestId);
                  setShowPreview(false);
                  onOpenChange(false);
                }}>
                  <Check className="ml-2 h-4 w-4" />
                  אישור ושליחה למנהל
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
