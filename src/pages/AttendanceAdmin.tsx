import { useMemo, useState } from 'react';
import { format, parseISO, differenceInSeconds, startOfDay, endOfDay, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
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
import { useAllClockEvents, useLatestEventPerUser, useUpdateAttendanceSettings } from '@/hooks/useAttendanceAdmin';
import { useAttendanceSettings } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';

const METHOD_LABELS: Record<string, string> = { qr: 'QR', nfc: 'NFC', manual: 'ידני', wfh: 'מהבית' };

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}ש' ${m}ד'`;
}

export default function AttendanceAdmin() {
  const { data: latest = [] } = useLatestEventPerUser();
  const { data: employees = [] } = useEmployees();
  const { data: settings } = useAttendanceSettings();
  const updateSettings = useUpdateAttendanceSettings();

  // Filters for events tab
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

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

  // Live status
  const activeEmployees = employees.filter((e: any) => e.is_active !== false);
  const statusMap = new Map(latest.map((e) => [e.user_id, e]));
  const inWork = activeEmployees.filter((e: any) => statusMap.get(e.user_id)?.type === 'in');
  const wfhInWork = inWork.filter((e: any) => statusMap.get(e.user_id)?.method === 'wfh');
  const officeInWork = inWork.filter((e: any) => statusMap.get(e.user_id)?.method !== 'wfh');
  const notIn = activeEmployees.filter((e: any) => {
    const s = statusMap.get(e.user_id);
    return !s || s.type === 'out';
  });

  // Hours summary per user across range (pair in/out)
  const hoursByUser = useMemo(() => {
    const grouped = new Map<string, any[]>();
    for (const e of rangeEvents) {
      if (!grouped.has(e.user_id)) grouped.set(e.user_id, []);
      grouped.get(e.user_id)!.push(e);
    }
    const result: Array<{ user_id: string; full_name: string; seconds: number; sessions: number }> = [];
    grouped.forEach((evs, uid) => {
      const sorted = [...evs].sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
      let total = 0;
      let sessions = 0;
      let openIn: any = null;
      for (const ev of sorted) {
        if (ev.type === 'in') openIn = ev;
        else if (ev.type === 'out' && openIn) {
          total += Math.max(0, differenceInSeconds(parseISO(ev.event_time), parseISO(openIn.event_time)));
          sessions++;
          openIn = null;
        }
      }
      const name = evs[0]?.profile?.full_name || 'לא ידוע';
      result.push({ user_id: uid, full_name: name, seconds: total, sessions });
    });
    return result.sort((a, b) => b.seconds - a.seconds);
  }, [rangeEvents]);

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">ניהול נוכחות</h1>
        <p className="text-sm text-muted-foreground">תמונה מלאה של נוכחות העובדים, שעות והגדרות</p>
      </div>

      {/* Live summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="בעבודה כרגע" value={inWork.length} sub={`${officeInWork.length} בשטח · ${wfhInWork.length} מהבית`} tone="success" />
        <SummaryCard label="לא בעבודה" value={notIn.length} sub="עובדים פעילים שלא נכנסו" tone="muted" />
        <SummaryCard label="סה״כ עובדים פעילים" value={activeEmployees.length} sub="במערכת" tone="default" />
        <SummaryCard label="אירועים בטווח" value={rangeEvents.length} sub={`${fromDate} → ${toDate}`} tone="default" />
      </div>

      <Tabs defaultValue="live">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="live">סטטוס חי</TabsTrigger>
          <TabsTrigger value="events">לוג אירועים</TabsTrigger>
          <TabsTrigger value="hours">סיכום שעות</TabsTrigger>
          <TabsTrigger value="settings">הגדרות</TabsTrigger>
        </TabsList>

        {/* LIVE STATUS */}
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
                        </div>
                      </div>
                      {s && <Badge variant="outline" className="text-[10px]">{METHOD_LABELS[s.method] || s.method}</Badge>}
                      <Badge variant={isIn ? 'default' : 'secondary'}>
                        {isIn ? 'בעבודה' : 'לא בעבודה'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS LOG */}
        <TabsContent value="events" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>עובד</TableHead>
                    <TableHead>פעולה</TableHead>
                    <TableHead>שיטה</TableHead>
                    <TableHead>זמן</TableHead>
                    <TableHead>הערה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">אין רשומות בטווח זה</TableCell></TableRow>
                  ) : filteredEvents.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.profile?.full_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={e.type === 'in' ? 'default' : 'secondary'}>
                          {e.type === 'in' ? 'כניסה' : 'יציאה'}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">{METHOD_LABELS[e.method] || e.method}</Badge></TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {format(parseISO(e.event_time), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{e.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOURS SUMMARY */}
        <TabsContent value="hours" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">סיכום שעות לפי עובד</CardTitle>
              <p className="text-xs text-muted-foreground">{fromDate} → {toDate}</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>עובד</TableHead>
                    <TableHead>סה״כ שעות</TableHead>
                    <TableHead>סשנים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursByUser.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">אין נתונים</TableCell></TableRow>
                  ) : hoursByUser.map((h) => {
                    const overtime = settings && h.seconds / 3600 > settings.weekly_overtime_threshold;
                    return (
                      <TableRow key={h.user_id}>
                        <TableCell className="font-medium">{h.full_name}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatHours(h.seconds)}
                          {overtime && <Badge variant="destructive" className="mr-2 text-[10px]">חריגה</Badge>}
                        </TableCell>
                        <TableCell>{h.sessions}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="mt-4">
          {settings && (
            <Card>
              <CardHeader><CardTitle className="text-base">הגדרות נוכחות</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumberSetting
                    id={settings.id} field="daily_hours" label="שעות יומיות רגילות"
                    value={settings.daily_hours} step={0.5} mutate={updateSettings.mutate}
                  />
                  <NumberSetting
                    id={settings.id} field="weekly_overtime_threshold" label="סף שעות נוספות שבועי"
                    value={settings.weekly_overtime_threshold} step={1} mutate={updateSettings.mutate}
                  />
                  <NumberSetting
                    id={settings.id} field="overtime_multiplier" label="מכפיל שעות נוספות"
                    value={settings.overtime_multiplier} step={0.05} mutate={updateSettings.mutate}
                  />
                  <NumberSetting
                    id={settings.id} field="manual_entry_max_days_back" label="ימים אחורה לדיווח ידני"
                    value={settings.manual_entry_max_days_back} step={1} mutate={updateSettings.mutate}
                  />
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <h3 className="font-medium text-sm">שיטות כניסה מותרות</h3>
                  <BoolSetting id={settings.id} field="allow_qr" label="QR" value={settings.allow_qr} mutate={updateSettings.mutate} />
                  <BoolSetting id={settings.id} field="allow_nfc" label="NFC" value={settings.allow_nfc} mutate={updateSettings.mutate} />
                  <BoolSetting id={settings.id} field="allow_manual" label="כניסה ידנית" value={settings.allow_manual} mutate={updateSettings.mutate} />
                  <BoolSetting id={settings.id} field="allow_wfh" label="כניסה מהבית" value={settings.allow_wfh} mutate={updateSettings.mutate} />
                  <BoolSetting id={settings.id} field="require_gps_for_qr" label="חייב GPS בכניסת QR" value={settings.require_gps_for_qr} mutate={updateSettings.mutate} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
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
