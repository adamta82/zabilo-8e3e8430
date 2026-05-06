import { useMemo, useState } from 'react';
import { format, parseISO, differenceInSeconds, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { Download, MapPin, FileText, MailQuestion } from 'lucide-react';
import { useRequestMonthCorrections } from '@/hooks/useDayMarks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAllClockEvents, useLatestEventPerUser, useUpdateAttendanceSettings, type AdminClockEvent } from '@/hooks/useAttendanceAdmin';
import { useAttendanceSettings } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { LocationsManager } from '@/components/attendance/LocationsManager';

const METHOD_LABELS: Record<string, string> = { qr: 'QR', nfc: 'NFC', manual: 'ידני', wfh: 'מהבית' };

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}
function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}ש' ${m.toString().padStart(2, '0')}ד'`;
}
function decimalHours(seconds: number) {
  return (seconds / 3600).toFixed(2);
}

export default function AttendanceAdmin() {
  const { data: latest = [] } = useLatestEventPerUser();
  const { data: employees = [] } = useEmployees();
  const { data: settings } = useAttendanceSettings();
  const updateSettings = useUpdateAttendanceSettings();

  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [reportEmployee, setReportEmployee] = useState<any | null>(null);

  const fromIso = startOfDay(parseISO(fromDate)).toISOString();
  const toIso = endOfDay(parseISO(toDate)).toISOString();
  const { data: rangeEvents = [] } = useAllClockEvents(fromIso, toIso);

  const filteredEvents = useMemo(() => {
    return rangeEvents.filter((e) => {
      if (methodFilter !== 'all' && e.method !== methodFilter) return false;
      if (userFilter !== 'all' && e.user_id !== userFilter) return false;
      return true;
    });
  }, [rangeEvents, methodFilter, userFilter]);

  const activeEmployees = employees.filter((e: any) => e.is_active !== false);
  const statusMap = new Map(latest.map((e) => [e.user_id, e]));
  const inWork = activeEmployees.filter((e: any) => statusMap.get(e.user_id)?.type === 'in');
  const wfhInWork = inWork.filter((e: any) => statusMap.get(e.user_id)?.method === 'wfh');
  const officeInWork = inWork.filter((e: any) => statusMap.get(e.user_id)?.method !== 'wfh');
  const notIn = activeEmployees.filter((e: any) => {
    const s = statusMap.get(e.user_id);
    return !s || s.type === 'out';
  });

  const hoursByUser = useMemo(() => {
    const grouped = new Map<string, AdminClockEvent[]>();
    for (const e of rangeEvents) {
      if (!grouped.has(e.user_id)) grouped.set(e.user_id, []);
      grouped.get(e.user_id)!.push(e);
    }
    const result: Array<{ user_id: string; full_name: string; seconds: number; sessions: number; methods: Record<string, number> }> = [];
    grouped.forEach((evs, uid) => {
      const sorted = [...evs].sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
      let total = 0;
      let sessions = 0;
      let openIn: AdminClockEvent | null = null;
      const methods: Record<string, number> = {};
      for (const ev of sorted) {
        if (ev.type === 'in') {
          openIn = ev;
          methods[ev.method] = (methods[ev.method] || 0) + 1;
        } else if (ev.type === 'out' && openIn) {
          total += Math.max(0, differenceInSeconds(parseISO(ev.event_time), parseISO(openIn.event_time)));
          sessions++;
          openIn = null;
        }
      }
      const name = evs[0]?.profile?.full_name || 'לא ידוע';
      result.push({ user_id: uid, full_name: name, seconds: total, sessions, methods });
    });
    return result.sort((a, b) => b.seconds - a.seconds);
  }, [rangeEvents]);

  // Export hours summary as CSV
  const exportHoursCsv = () => {
    const rows = [['עובד', 'סשנים', 'סה״כ שעות', 'שעות עשרוני', 'QR', 'NFC', 'ידני', 'מהבית']];
    hoursByUser.forEach((h) => {
      rows.push([
        h.full_name, String(h.sessions), formatHours(h.seconds), decimalHours(h.seconds),
        String(h.methods.qr || 0), String(h.methods.nfc || 0), String(h.methods.manual || 0), String(h.methods.wfh || 0),
      ]);
    });
    downloadCsv(`attendance-${fromDate}_${toDate}.csv`, rows);
  };

  const exportEventsCsv = () => {
    const rows = [['תאריך', 'שעה', 'עובד', 'פעולה', 'שיטה', 'מיקום', 'GPS', 'הערה']];
    filteredEvents.forEach((e) => {
      const dt = parseISO(e.event_time);
      rows.push([
        format(dt, 'dd/MM/yyyy'),
        format(dt, 'HH:mm:ss'),
        e.profile?.full_name || '',
        e.type === 'in' ? 'כניסה' : 'יציאה',
        METHOD_LABELS[e.method] || e.method,
        e.location?.name || '',
        e.gps_lat && e.gps_lng ? `${e.gps_lat.toFixed(5)},${e.gps_lng.toFixed(5)}` : '',
        e.notes || '',
      ]);
    });
    downloadCsv(`events-${fromDate}_${toDate}.csv`, rows);
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">ניהול נוכחות</h1>
        <p className="text-sm text-muted-foreground">תמונה מלאה של נוכחות העובדים, מיקומים, שעות והגדרות</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="בעבודה כרגע" value={inWork.length} sub={`${officeInWork.length} בשטח · ${wfhInWork.length} מהבית`} tone="success" />
        <SummaryCard label="לא בעבודה" value={notIn.length} sub="עובדים פעילים שלא נכנסו" tone="muted" />
        <SummaryCard label="עובדים פעילים" value={activeEmployees.length} sub="במערכת" tone="default" />
        <SummaryCard label="אירועים בטווח" value={rangeEvents.length} sub={`${fromDate} → ${toDate}`} tone="default" />
      </div>

      <Tabs defaultValue="live">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="live">סטטוס חי</TabsTrigger>
          <TabsTrigger value="events">לוג אירועים</TabsTrigger>
          <TabsTrigger value="hours">דוח שעות</TabsTrigger>
          <TabsTrigger value="locations">מיקומים</TabsTrigger>
          <TabsTrigger value="settings">הגדרות</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">סטטוס לכל עובד</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {activeEmployees.map((emp: any) => {
                  const s = statusMap.get(emp.user_id);
                  const isIn = s?.type === 'in';
                  return (
                    <div key={emp.id} className="flex items-center gap-3 p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={emp.avatar_url || undefined} />
                        <AvatarFallback>{initials(emp.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{emp.full_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s ? `${s.type === 'in' ? 'נכנס/ה' : 'יצא/ה'} ב-${format(parseISO(s.event_time), 'HH:mm dd/MM', { locale: he })}` : 'אין רשומות'}
                          {s?.location?.name && ` · ${s.location.name}`}
                        </div>
                      </div>
                      {s && <Badge variant="outline" className="text-[10px]">{METHOD_LABELS[s.method] || s.method}</Badge>}
                      <Badge variant={isIn ? 'default' : 'secondary'}>
                        {isIn ? 'בעבודה' : 'לא בעבודה'}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => setReportEmployee(emp)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <Label>מתאריך</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label>עד תאריך</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div>
                <Label>שיטה</Label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="qr">QR</SelectItem>
                    <SelectItem value="nfc">NFC</SelectItem>
                    <SelectItem value="manual">ידני</SelectItem>
                    <SelectItem value="wfh">מהבית</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>עובד</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל העובדים</SelectItem>
                    {activeEmployees.map((e: any) => (
                      <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={exportEventsCsv} variant="outline" className="w-full">
                  <Download className="ml-2 h-4 w-4" />ייצוא CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>עובד</TableHead>
                    <TableHead>פעולה</TableHead>
                    <TableHead>שיטה</TableHead>
                    <TableHead>זמן</TableHead>
                    <TableHead>מיקום</TableHead>
                    <TableHead>GPS</TableHead>
                    <TableHead>הערה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">אין רשומות בטווח זה</TableCell></TableRow>
                  ) : filteredEvents.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium whitespace-nowrap">{e.profile?.full_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={e.type === 'in' ? 'default' : 'secondary'}>
                          {e.type === 'in' ? 'כניסה' : 'יציאה'}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">{METHOD_LABELS[e.method] || e.method}</Badge></TableCell>
                      <TableCell className="text-sm tabular-nums whitespace-nowrap">
                        {format(parseISO(e.event_time), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </TableCell>
                      <TableCell className="text-sm">{e.location?.name || '—'}</TableCell>
                      <TableCell>
                        {e.gps_lat && e.gps_lng ? (
                          <a
                            href={`https://maps.google.com/?q=${e.gps_lat},${e.gps_lng}`}
                            target="_blank" rel="noreferrer"
                            className="text-primary text-xs inline-flex items-center gap-1 hover:underline"
                          >
                            <MapPin className="h-3 w-3" />הצג
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{e.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">דוח שעות לפי עובד</CardTitle>
                <p className="text-xs text-muted-foreground">{fromDate} → {toDate}</p>
              </div>
              <Button onClick={exportHoursCsv} variant="outline" size="sm">
                <Download className="ml-2 h-4 w-4" />ייצוא CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>עובד</TableHead>
                    <TableHead>סה״כ שעות</TableHead>
                    <TableHead>עשרוני</TableHead>
                    <TableHead>סשנים</TableHead>
                    <TableHead>פירוט שיטות</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursByUser.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">אין נתונים</TableCell></TableRow>
                  ) : hoursByUser.map((h) => {
                    const overtime = settings && h.seconds / 3600 > settings.weekly_overtime_threshold;
                    const emp = activeEmployees.find((e: any) => e.user_id === h.user_id);
                    return (
                      <TableRow key={h.user_id}>
                        <TableCell className="font-medium">{h.full_name}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatHours(h.seconds)}
                          {overtime && <Badge variant="destructive" className="mr-2 text-[10px]">חריגה</Badge>}
                        </TableCell>
                        <TableCell className="tabular-nums">{decimalHours(h.seconds)}</TableCell>
                        <TableCell>{h.sessions}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {Object.entries(h.methods).map(([m, c]) => `${METHOD_LABELS[m]}: ${c}`).join(' · ') || '—'}
                        </TableCell>
                        <TableCell className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => emp && setReportEmployee(emp)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <RequestCorrectionButton userId={h.user_id} fromDate={fromDate} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="mt-4">
          <LocationsManager />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {settings && (
            <Card>
              <CardHeader><CardTitle className="text-base">הגדרות נוכחות</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumberSetting id={settings.id} field="daily_hours" label="שעות יומיות רגילות"
                    value={settings.daily_hours} step={0.5} mutate={updateSettings.mutate} />
                  <NumberSetting id={settings.id} field="weekly_overtime_threshold" label="סף שעות נוספות שבועי"
                    value={settings.weekly_overtime_threshold} step={1} mutate={updateSettings.mutate} />
                  <NumberSetting id={settings.id} field="overtime_multiplier" label="מכפיל שעות נוספות"
                    value={settings.overtime_multiplier} step={0.05} mutate={updateSettings.mutate} />
                  <NumberSetting id={settings.id} field="manual_entry_max_days_back" label="ימים אחורה לדיווח ידני"
                    value={settings.manual_entry_max_days_back} step={1} mutate={updateSettings.mutate} />
                </div>
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="font-medium text-sm">שיטות כניסה מותרות</h3>
                  <BoolSetting id={settings.id} field="allow_qr" label="QR" value={settings.allow_qr} mutate={updateSettings.mutate} />
                  <BoolSetting id={settings.id} field="allow_nfc" label="NFC (בקרוב)" value={settings.allow_nfc} mutate={updateSettings.mutate} />
                  <BoolSetting id={settings.id} field="allow_manual" label="כניסה ידנית" value={settings.allow_manual} mutate={updateSettings.mutate} />
                  <BoolSetting id={settings.id} field="allow_wfh" label="כניסה מהבית" value={settings.allow_wfh} mutate={updateSettings.mutate} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {reportEmployee && (
        <EmployeeReportDialog
          employee={reportEmployee}
          fromDate={fromDate}
          toDate={toDate}
          events={rangeEvents.filter((e) => e.user_id === reportEmployee.user_id)}
          onClose={() => setReportEmployee(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: string }) {
  const toneClass = tone === 'success' ? 'text-green-600' : tone === 'muted' ? 'text-muted-foreground' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function NumberSetting({ id, field, label, value, step, mutate }: any) {
  const [v, setV] = useState(value);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input type="number" step={step} value={v} onChange={(e) => setV(parseFloat(e.target.value))} />
        <Button size="sm" disabled={v === value} onClick={() => mutate({ id, patch: { [field]: v } })}>שמירה</Button>
      </div>
    </div>
  );
}

function BoolSetting({ id, field, label, value, mutate }: any) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={value} onCheckedChange={(checked) => mutate({ id, patch: { [field]: checked } })} />
    </div>
  );
}

function RequestCorrectionButton({ userId, fromDate }: { userId: string; fromDate: string }) {
  const requestCorr = useRequestMonthCorrections();
  const ref = parseISO(fromDate);
  const year = ref.getFullYear();
  const month = ref.getMonth() + 1;
  return (
    <Button size="sm" variant="ghost" title="בקש תיקונים לחודש שנבחר"
      onClick={() => requestCorr.mutate({ user_id: userId, year, month, message: 'נא לעדכן דיווחים חסרים/לא מדויקים' })}>
      <MailQuestion className="h-4 w-4" />
    </Button>
  );
}

function EmployeeReportDialog({
  employee, fromDate, toDate, events, onClose,
}: {
  employee: any; fromDate: string; toDate: string; events: AdminClockEvent[]; onClose: () => void;
}) {
  // Group events by day
  const days = useMemo(() => {
    const range = eachDayOfInterval({ start: parseISO(fromDate), end: parseISO(toDate) }).reverse();
    return range.map((d) => {
      const dayKey = format(d, 'yyyy-MM-dd');
      const dayEvents = events
        .filter((e) => format(parseISO(e.event_time), 'yyyy-MM-dd') === dayKey)
        .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
      // pair into sessions
      const sessions: Array<{ in?: AdminClockEvent; out?: AdminClockEvent }> = [];
      let curr: { in?: AdminClockEvent; out?: AdminClockEvent } | null = null;
      for (const ev of dayEvents) {
        if (ev.type === 'in') {
          if (curr) sessions.push(curr);
          curr = { in: ev };
        } else if (ev.type === 'out') {
          if (curr) { curr.out = ev; sessions.push(curr); curr = null; }
          else sessions.push({ out: ev });
        }
      }
      if (curr) sessions.push(curr);
      const totalSec = sessions.reduce((acc, s) => {
        if (s.in && s.out) return acc + Math.max(0, differenceInSeconds(parseISO(s.out.event_time), parseISO(s.in.event_time)));
        return acc;
      }, 0);
      return { date: d, sessions, totalSec };
    });
  }, [events, fromDate, toDate]);

  const grandTotal = days.reduce((acc, d) => acc + d.totalSec, 0);

  const exportCsv = () => {
    const rows = [['תאריך', 'כניסה', 'יציאה', 'שיטה', 'מיקום', 'GPS', 'משך', 'הערה']];
    days.forEach((d) => {
      if (d.sessions.length === 0) return;
      d.sessions.forEach((s) => {
        const ref = s.in || s.out!;
        rows.push([
          format(d.date, 'dd/MM/yyyy'),
          s.in ? format(parseISO(s.in.event_time), 'HH:mm') : '—',
          s.out ? format(parseISO(s.out.event_time), 'HH:mm') : '—',
          METHOD_LABELS[ref.method] || ref.method,
          ref.location?.name || '',
          ref.gps_lat && ref.gps_lng ? `${ref.gps_lat.toFixed(5)},${ref.gps_lng.toFixed(5)}` : '',
          s.in && s.out ? formatHours(differenceInSeconds(parseISO(s.out.event_time), parseISO(s.in.event_time))) : '',
          ref.notes || '',
        ]);
      });
    });
    rows.push([], ['סה״כ', '', '', '', '', '', formatHours(grandTotal), '']);
    downloadCsv(`${employee.full_name}-${fromDate}_${toDate}.csv`, rows);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8"><AvatarFallback>{initials(employee.full_name)}</AvatarFallback></Avatar>
            דוח נוכחות — {employee.full_name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">
            {fromDate} → {toDate} · סה״כ <span className="font-bold text-foreground">{formatHours(grandTotal)}</span>
          </div>
          <Button onClick={exportCsv} variant="outline" size="sm">
            <Download className="ml-2 h-4 w-4" />ייצוא CSV
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {days.map((d, idx) => (
            <Card key={idx} className={d.sessions.length === 0 ? 'opacity-50' : ''}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">
                    {format(d.date, 'EEEE dd/MM/yyyy', { locale: he })}
                  </div>
                  <Badge variant={d.totalSec > 0 ? 'default' : 'secondary'} className="text-[10px]">
                    {d.totalSec > 0 ? formatHours(d.totalSec) : 'אין נוכחות'}
                  </Badge>
                </div>
                {d.sessions.length > 0 && (
                  <ul className="space-y-1 text-xs">
                    {d.sessions.map((s, i) => {
                      const ref = s.in || s.out!;
                      return (
                        <li key={i} className="flex items-center gap-2 flex-wrap">
                          <span className="tabular-nums">
                            {s.in ? format(parseISO(s.in.event_time), 'HH:mm') : '—'} ← {s.out ? format(parseISO(s.out.event_time), 'HH:mm') : 'פתוח'}
                          </span>
                          <Badge variant="outline" className="text-[9px]">{METHOD_LABELS[ref.method]}</Badge>
                          {ref.location?.name && <span className="text-muted-foreground">· {ref.location.name}</span>}
                          {ref.gps_lat && ref.gps_lng && (
                            <a href={`https://maps.google.com/?q=${ref.gps_lat},${ref.gps_lng}`} target="_blank" rel="noreferrer"
                              className="text-primary inline-flex items-center gap-1 hover:underline">
                              <MapPin className="h-3 w-3" />GPS
                            </a>
                          )}
                          {ref.notes && <span className="text-muted-foreground italic">"{ref.notes}"</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
