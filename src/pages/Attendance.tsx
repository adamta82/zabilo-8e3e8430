import { useEffect, useMemo, useState } from 'react';
import {
  format, differenceInSeconds, parseISO, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isAfter, addMonths, subMonths, isSaturday, startOfDay,
} from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Clock, Home, LogOut, QrCode, ChevronRight, ChevronLeft, AlertCircle, Calendar as CalendarIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useCurrentClockStatus, useMyEventsInRange, useClockIn, useClockOut, useAttendanceSettings,
} from '@/hooks/useAttendance';
import { useMyDayMarks, useMyOpenCorrections, DAY_MARK_LABELS } from '@/hooks/useDayMarks';
import { QrScannerDialog } from '@/components/attendance/QrScannerDialog';
import { MonthCorrectionDialog } from '@/components/attendance/MonthCorrectionDialog';

const METHOD_LABELS: Record<string, string> = { qr: 'QR', nfc: 'NFC', manual: 'ידני', wfh: 'מהבית' };

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}
function fmtHM(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}ש' ${m.toString().padStart(2, '0')}ד'`;
}

export default function Attendance() {
  const { data: status } = useCurrentClockStatus();
  const { data: settings } = useAttendanceSettings();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const isClockedIn = status?.type === 'in';
  const [now, setNow] = useState(Date.now());
  const [qrOpen, setQrOpen] = useState(false);

  // Month navigation
  const [monthRef, setMonthRef] = useState(() => startOfMonth(new Date()));
  const monthStart = startOfMonth(monthRef);
  const monthEnd = endOfMonth(monthRef);
  const today = startOfDay(new Date());

  const { data: events = [] } = useMyEventsInRange(monthStart.toISOString(), monthEnd.toISOString());
  const { data: dayMarks = [] } = useMyDayMarks(format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'));
  const { data: openCorrections = [] } = useMyOpenCorrections();

  const [correctionDialog, setCorrectionDialog] = useState<{ open: boolean; year?: number; month?: number; id?: string }>({ open: false });

  useEffect(() => {
    if (!isClockedIn) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isClockedIn]);

  const elapsed = useMemo(() => {
    if (!isClockedIn || !status) return 0;
    return Math.max(0, differenceInSeconds(new Date(now), parseISO(status.event_time)));
  }, [isClockedIn, status, now]);

  // Group events into sessions per day
  const dayData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return days.map((day) => {
      const dayEvents = events
        .filter((e) => isSameDay(parseISO(e.event_time), day))
        .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
      // Pair sessions
      const sessions: Array<{ in?: typeof events[number]; out?: typeof events[number] }> = [];
      let cur: { in?: typeof events[number]; out?: typeof events[number] } | null = null;
      for (const ev of dayEvents) {
        if (ev.type === 'in') {
          if (cur) sessions.push(cur);
          cur = { in: ev };
        } else {
          if (cur) { cur.out = ev; sessions.push(cur); cur = null; }
          else sessions.push({ out: ev });
        }
      }
      if (cur) sessions.push(cur);
      const totalSec = sessions.reduce((sum, s) => {
        if (s.in && s.out) return sum + differenceInSeconds(parseISO(s.out.event_time), parseISO(s.in.event_time));
        return sum;
      }, 0);
      const mark = dayMarks.find((m) => m.date === format(day, 'yyyy-MM-dd'));
      const isFuture = isAfter(day, today);
      const isSat = isSaturday(day);
      const hasReport = sessions.length > 0;
      return { day, sessions, totalSec, mark, isFuture, isSat, hasReport };
    });
  }, [events, dayMarks, monthStart, monthEnd, today]);

  const totalMonthSec = dayData.reduce((s, d) => s + d.totalSec, 0);
  const isCurrentMonth = isSameDay(monthStart, startOfMonth(new Date()));

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">נוכחות ושעות</h1>
        <p className="text-sm text-muted-foreground">דווח/י על שעות עבודה ועקוב/י אחרי ההיסטוריה החודשית</p>
      </div>

      {/* Open correction requests */}
      {openCorrections.map((c) => (
        <Alert key={c.id} className="border-warning bg-warning/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>בקשת תיקונים פתוחה — {format(new Date(c.year, c.month - 1, 1), 'MMMM yyyy', { locale: he })}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">{c.message || 'המנהל ביקש לעדכן את דיווחי הנוכחות עבור החודש.'}</p>
            <Button size="sm" onClick={() => {
              setMonthRef(startOfMonth(new Date(c.year, c.month - 1, 1)));
              setCorrectionDialog({ open: true, year: c.year, month: c.month, id: c.id });
            }}>
              עדכון דיווחים
            </Button>
          </AlertDescription>
        </Alert>
      ))}

      {/* Current status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isClockedIn ? 'אתה בעבודה' : 'לא בעבודה כרגע'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isClockedIn && status ? (
            <div className="text-center py-2">
              <div className="text-4xl md:text-5xl font-mono font-bold tabular-nums">{fmtDuration(elapsed)}</div>
              <div className="text-sm text-muted-foreground mt-2">
                כניסה: {format(parseISO(status.event_time), 'HH:mm — dd/MM/yyyy', { locale: he })}
              </div>
              <Badge variant="outline" className="mt-2">{METHOD_LABELS[status.method] || status.method}</Badge>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-2">לחץ על אחד הכפתורים למטה כדי להתחיל</p>
          )}

          <div className="grid gap-2">
            {settings?.allow_qr !== false && (
              <Button size="lg" variant="outline" className="w-full h-14" onClick={() => setQrOpen(true)}>
                <QrCode className="ml-2 h-5 w-5" />
                סריקת QR (כניסה / יציאה)
              </Button>
            )}
            {!isClockedIn ? (
              settings?.allow_wfh !== false && (
                <Button size="lg" className="w-full h-14" onClick={() => clockIn.mutate({ method: 'wfh' })}
                  disabled={clockIn.isPending}>
                  <Home className="ml-2 h-5 w-5" />
                  כניסה מהבית
                </Button>
              )
            ) : (
              <Button size="lg" variant="destructive" className="w-full h-14"
                onClick={() => clockOut.mutate({ method: status?.method || 'wfh' })}
                disabled={clockOut.isPending}>
                <LogOut className="ml-2 h-5 w-5" />
                יציאה מהעבודה
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly history */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              היסטוריה חודשית
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setMonthRef((m) => subMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium min-w-[110px] text-center">
                {format(monthRef, 'MMMM yyyy', { locale: he })}
              </div>
              <Button variant="ghost" size="icon" disabled={isCurrentMonth}
                onClick={() => setMonthRef((m) => addMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>סה"כ חודש: <strong className="text-foreground">{fmtHM(totalMonthSec)}</strong></span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {dayData.map(({ day, sessions, totalSec, mark, isFuture, isSat, hasReport }) => {
              const dateLabel = format(day, 'EEEE dd/MM', { locale: he });
              return (
                <li key={day.toISOString()}
                  className={`px-4 py-3 flex items-start justify-between gap-3 ${isSat ? 'bg-muted/40' : ''} ${isFuture ? 'opacity-50' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{dateLabel}</div>
                    {isSat ? (
                      <div className="text-xs text-muted-foreground mt-0.5">שבת</div>
                    ) : mark ? (
                      <div className="text-xs mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">{DAY_MARK_LABELS[mark.type]}</Badge>
                        {mark.note && <span className="text-muted-foreground mr-1">— {mark.note}</span>}
                      </div>
                    ) : sessions.length > 0 ? (
                      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                        {sessions.map((s, i) => (
                          <div key={i}>
                            {s.in ? format(parseISO(s.in.event_time), 'HH:mm') : '—'}
                            {' ← '}
                            {s.out ? format(parseISO(s.out.event_time), 'HH:mm') : '— (פתוח)'}
                          </div>
                        ))}
                      </div>
                    ) : !isFuture ? (
                      <div className="text-xs text-destructive mt-0.5">אין דיווח</div>
                    ) : null}
                  </div>
                  {hasReport && (
                    <div className="text-sm font-mono tabular-nums">{fmtHM(totalSec)}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <QrScannerDialog open={qrOpen} onOpenChange={setQrOpen} />
      {correctionDialog.open && correctionDialog.year && correctionDialog.month && (
        <MonthCorrectionDialog
          open={correctionDialog.open}
          onOpenChange={(o) => setCorrectionDialog({ ...correctionDialog, open: o })}
          year={correctionDialog.year}
          month={correctionDialog.month}
          correctionRequestId={correctionDialog.id!}
        />
      )}
    </div>
  );
}
