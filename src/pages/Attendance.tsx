import { useEffect, useMemo, useState } from 'react';
import { format, differenceInSeconds, parseISO, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Clock, Home, LogIn, LogOut, Trash2, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useCurrentClockStatus, useMyClockEvents, useClockIn, useClockOut, useDeleteSession, useAttendanceSettings,
} from '@/hooks/useAttendance';
import { QrScannerDialog } from '@/components/attendance/QrScannerDialog';

const METHOD_LABELS: Record<string, string> = {
  qr: 'QR',
  nfc: 'NFC',
  manual: 'ידני',
  wfh: 'מהבית',
};

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function Attendance() {
  const { data: status } = useCurrentClockStatus();
  const { data: events = [] } = useMyClockEvents(100);
  const { data: settings } = useAttendanceSettings();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const deleteSession = useDeleteSession();

  const isClockedIn = status?.type === 'in';
  const [now, setNow] = useState(Date.now());
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (!isClockedIn) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isClockedIn]);

  const elapsedSeconds = useMemo(() => {
    if (!isClockedIn || !status) return 0;
    return Math.max(0, differenceInSeconds(new Date(now), parseISO(status.event_time)));
  }, [isClockedIn, status, now]);

  // Manual entry state
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const nowStr = format(new Date(), 'HH:mm');
  const [mDate, setMDate] = useState(todayStr);
  const [mTime, setMTime] = useState(nowStr);
  const [mNotes, setMNotes] = useState('');
  const maxDaysBack = settings?.manual_entry_max_days_back ?? 7;
  const minDate = format(subDays(new Date(), maxDaysBack), 'yyyy-MM-dd');

  const sessions = useMemo(() => {
    const sorted = [...events].sort((a, b) =>
      new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
    );
    const result: Array<{ in?: typeof events[number]; out?: typeof events[number] }> = [];
    let current: { in?: typeof events[number]; out?: typeof events[number] } | null = null;
    for (const ev of sorted) {
      if (ev.type === 'in') {
        if (current) result.push(current);
        current = { in: ev };
      } else if (ev.type === 'out') {
        if (current) {
          current.out = ev;
          result.push(current);
          current = null;
        } else {
          result.push({ out: ev });
        }
      }
    }
    if (current) result.push(current);
    return result.reverse();
  }, [events]);

  const handleManualSubmit = (type: 'in' | 'out') => {
    const isoTime = new Date(`${mDate}T${mTime}:00`).toISOString();
    if (type === 'in') {
      clockIn.mutate({ method: 'manual', event_time: isoTime, notes: mNotes || null });
    } else {
      clockOut.mutate({ method: 'manual', event_time: isoTime, notes: mNotes || null });
    }
    setMNotes('');
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">נוכחות ושעות</h1>
        <p className="text-sm text-muted-foreground">דווח/י על שעות עבודה ועקוב/י אחרי ההיסטוריה שלך</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isClockedIn ? 'אתה בעבודה' : 'לא בעבודה כרגע'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isClockedIn && status ? (
            <div className="text-center py-4">
              <div className="text-4xl md:text-5xl font-mono font-bold tabular-nums">
                {formatDuration(elapsedSeconds)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                כניסה: {format(parseISO(status.event_time), 'HH:mm — dd/MM/yyyy', { locale: he })}
              </div>
              <Badge variant="outline" className="mt-2">{METHOD_LABELS[status.method] || status.method}</Badge>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">לחץ על אחד הכפתורים למטה כדי להתחיל</p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="quick">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="quick">פעולה מהירה</TabsTrigger>
          <TabsTrigger value="manual">דיווח ידני</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-3 mt-4">
          {settings?.allow_qr !== false && (
            <Button
              size="lg"
              variant="outline"
              className="w-full h-16 text-lg"
              onClick={() => setQrOpen(true)}
            >
              <QrCode className="ml-2 h-5 w-5" />
              סריקת QR (כניסה / יציאה)
            </Button>
          )}
          {!isClockedIn ? (
            <>
              {settings?.allow_wfh !== false && (
                <Button
                  size="lg"
                  className="w-full h-16 text-lg"
                  onClick={() => clockIn.mutate({ method: 'wfh' })}
                  disabled={clockIn.isPending}
                >
                  <Home className="ml-2 h-5 w-5" />
                  כניסה מהבית
                </Button>
              )}
            </>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              className="w-full h-16 text-lg"
              onClick={() => clockOut.mutate({ method: status?.method || 'manual' })}
              disabled={clockOut.isPending}
            >
              <LogOut className="ml-2 h-5 w-5" />
              יציאה מהעבודה
            </Button>
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">דיווח ידני</CardTitle>
              <p className="text-xs text-muted-foreground">
                ניתן לדווח עד {maxDaysBack} ימים אחורה. רשומות ידניות מסומנות כ"ידני".
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="m-date">תאריך</Label>
                  <Input id="m-date" type="date" value={mDate} min={minDate} max={todayStr}
                    onChange={(e) => setMDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="m-time">שעה</Label>
                  <Input id="m-time" type="time" value={mTime} onChange={(e) => setMTime(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="m-notes">הערה (אופציונלי)</Label>
                <Textarea id="m-notes" value={mNotes} onChange={(e) => setMNotes(e.target.value)}
                  placeholder="לדוגמה: עבדתי על פרויקט X" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => handleManualSubmit('in')} disabled={clockIn.isPending}>
                  <LogIn className="ml-2 h-4 w-4" />
                  רישום כניסה
                </Button>
                <Button variant="secondary" onClick={() => handleManualSubmit('out')} disabled={clockOut.isPending}>
                  <LogOut className="ml-2 h-4 w-4" />
                  רישום יציאה
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">היסטוריה אחרונה</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין רשומות עדיין</p>
          ) : (
            <ul className="divide-y">
              {sessions.map((s, idx) => {
                const ref = s.in || s.out!;
                const dateStr = format(parseISO(ref.event_time), 'EEEE dd/MM/yyyy', { locale: he });
                const inTime = s.in ? format(parseISO(s.in.event_time), 'HH:mm') : '—';
                const outTime = s.out ? format(parseISO(s.out.event_time), 'HH:mm') : '— (פתוח)';
                const duration = s.in && s.out
                  ? formatDuration(differenceInSeconds(parseISO(s.out.event_time), parseISO(s.in.event_time)))
                  : null;
                const ids = [s.in?.id, s.out?.id].filter(Boolean) as string[];
                return (
                  <li key={idx} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{dateStr}</div>
                      <div className="text-xs text-muted-foreground">
                        {inTime} ← {outTime}
                        {duration && <span className="mr-2">· {duration}</span>}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {METHOD_LABELS[ref.method] || ref.method}
                        </Badge>
                        {ref.notes && <span className="text-[11px] text-muted-foreground truncate">"{ref.notes}"</span>}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>למחוק את הסשן?</AlertDialogTitle>
                          <AlertDialogDescription>
                            פעולה זו תמחק גם את הכניסה וגם את היציאה של הסשן. אינה הפיכה.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSession.mutate(ids)}>מחיקה</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <QrScannerDialog open={qrOpen} onOpenChange={setQrOpen} />
    </div>
  );
}
