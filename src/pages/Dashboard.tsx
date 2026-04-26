import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay, isWithinInterval, isSaturday, startOfWeek, addDays, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, Clock, Home, Palmtree, Filter, ArrowRight, CalendarDays, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useRequests } from '@/hooks/useRequests';
import { useDepartments } from '@/hooks/useDepartments';
import { useShifts } from '@/hooks/useShifts';
import { useEmployees } from '@/hooks/useEmployees';
import { israeliHolidays, formatDateString, parseLocalDate } from '@/lib/calendar-utils';
import { useGoogleCalendarEvents, CalendarEvent } from '@/hooks/useGoogleCalendar';

const weekDayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const HEBREW_DAYS_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

type ViewMode = 'month' | 'week' | 'day';

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<string>(formatDateString(new Date()));

  const { data: requests, isLoading: requestsLoading } = useRequests();
  const { data: departments, isLoading: departmentsLoading } = useDepartments();
  const { data: employees } = useEmployees();

  // Compute date ranges for shifts query
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const weekStart = startOfWeek(new Date(selectedDate), { weekStartsOn: 0 });

  const shiftStartDate = viewMode === 'month' ? formatDateString(monthStart) : formatDateString(weekStart);
  const shiftEndDate = viewMode === 'month' ? formatDateString(monthEnd) : formatDateString(addDays(weekStart, 6));

  const { data: shifts } = useShifts(shiftStartDate, shiftEndDate);

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const emptySlots = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart.getTime()]
  );

  // Navigation
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(formatDateString(new Date()));
  };

  const navWeek = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir * 7);
    setSelectedDate(formatDateString(d));
    setCurrentMonth(d);
  };

  const navDay = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(formatDateString(d));
    setCurrentMonth(d);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(formatDateString(date));
    setViewMode('day');
  };

  // Filter events
  const calendarEvents = useMemo(() => {
    if (!requests) return [];
    return requests
      .filter(r => r.status === 'approved' || r.status === 'pending')
      .filter(r => r.type === 'wfh' || r.type === 'vacation')
      .filter(r => {
        if (selectedDepartment === 'all') return true;
        return r.profiles?.department_id === selectedDepartment;
      });
  }, [requests, selectedDepartment]);

  const getEventsForDay = (date: Date) => {
    const dateStr = formatDateString(date);
    return calendarEvents.filter(request => {
      if (request.type === 'wfh') return request.wfh_date === dateStr;
      if (request.type === 'vacation' && request.vacation_start_date && request.vacation_end_date) {
        return isWithinInterval(date, { start: parseLocalDate(request.vacation_start_date), end: parseLocalDate(request.vacation_end_date) });
      }
      return false;
    });
  };

  const getShiftsForDay = (dateStr: string) => {
    if (!shifts) return [];
    return shifts.filter(s => s.date === dateStr);
  };

  const getHoliday = (date: Date) => israeliHolidays[formatDateString(date)];

  // Stats
  const todayStr = formatDateString(new Date());
  const stats = useMemo(() => {
    if (!requests) return { wfhToday: 0, vacationToday: 0, pending: 0, nextHoliday: null as { date: Date; name: string } | null };
    const todayDate = parseLocalDate(todayStr);
    const wfhToday = requests.filter(r => r.type === 'wfh' && r.wfh_date === todayStr && r.status === 'approved').length;
    const vacationToday = requests.filter(r => {
      if (r.type !== 'vacation' || r.status !== 'approved' || !r.vacation_start_date || !r.vacation_end_date) return false;
      return isWithinInterval(todayDate, { start: parseLocalDate(r.vacation_start_date), end: parseLocalDate(r.vacation_end_date) });
    }).length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const futureHolidays = Object.entries(israeliHolidays)
      .filter(([date]) => date > todayStr)
      .map(([date, name]) => ({ date: parseLocalDate(date), name }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return { wfhToday, vacationToday, pending, nextHoliday: futureHolidays[0] || null };
  }, [requests, todayStr]);

  const isLoading = requestsLoading || departmentsLoading;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        {/* Row 1: View toggle + dept select */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {[
              { key: 'month' as ViewMode, label: 'חודש' },
              { key: 'week' as ViewMode, label: 'שבוע' },
              { key: 'day' as ViewMode, label: 'יום' },
            ].map(v => (
              <Button
                key={v.key}
                variant={viewMode === v.key ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setViewMode(v.key)}
              >
                {v.label}
              </Button>
            ))}
          </div>

          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[140px] sm:w-[180px] h-8">
              <Filter className="h-4 w-4 ml-2" />
              <SelectValue placeholder="כל המחלקות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המחלקות</SelectItem>
              {departments?.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: Date navigation */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => viewMode === 'month' ? goToPreviousMonth() : viewMode === 'week' ? navWeek(1) : navDay(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-sm sm:text-xl font-bold flex-1 text-center truncate">
              {viewMode === 'month' && format(currentMonth, 'MMMM yyyy', { locale: he })}
              {viewMode === 'week' && `${format(weekDays[0], 'd בMMM', { locale: he })} — ${format(weekDays[6], 'd בMMM', { locale: he })}`}
              {viewMode === 'day' && format(new Date(selectedDate), 'EEEE, d בMMM', { locale: he })}
            </h2>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => viewMode === 'month' ? goToNextMonth() : viewMode === 'week' ? navWeek(-1) : navDay(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={goToToday}>היום</Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-info" /><span>עבודה מהבית</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-success" /><span>חופשה</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-holiday" /><span>חג / שבת</span></div>
        <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-warning" /><span>ממתין</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-primary" /><span>משמרת</span></div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <MonthView
          daysInMonth={daysInMonth}
          emptySlots={emptySlots}
          getEventsForDay={getEventsForDay}
          getHoliday={getHoliday}
          getShiftsForDay={getShiftsForDay}
          isLoading={isLoading}
          onDayClick={handleDayClick}
        />
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <WeekView
          weekDays={weekDays}
          getEventsForDay={getEventsForDay}
          getHoliday={getHoliday}
          getShiftsForDay={getShiftsForDay}
          isLoading={isLoading}
          onDayClick={handleDayClick}
        />
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <DayView
          date={parseLocalDate(selectedDate)}
          dateStr={selectedDate}
          events={getEventsForDay(parseLocalDate(selectedDate))}
          shifts={getShiftsForDay(selectedDate)}
          holiday={getHoliday(parseLocalDate(selectedDate))}
          employees={employees || []}
          departments={departments || []}
          onBackToCalendar={() => setViewMode('month')}
        />
      )}

      {/* Quick Stats - hidden in day view */}
      {viewMode !== 'day' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">עובדים מהבית היום</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-info">{stats.wfhToday}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">בחופשה היום</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-success">{stats.vacationToday}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">בקשות ממתינות</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-warning">{stats.pending}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">החג הקרוב</CardTitle></CardHeader>
            <CardContent>
              {stats.nextHoliday ? (
                <>
                  <div className="text-lg font-bold text-holiday">{stats.nextHoliday.name}</div>
                  <div className="text-xs text-muted-foreground">{format(stats.nextHoliday.date, 'dd בMMMM', { locale: he })}</div>
                </>
              ) : <div className="text-muted-foreground">-</div>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ========== MONTH VIEW ==========
function MonthView({ daysInMonth, emptySlots, getEventsForDay, getHoliday, getShiftsForDay, isLoading, onDayClick }: any) {
  if (isLoading) {
    return (
      <Card><CardContent className="p-4">
        <div className="grid grid-cols-7 gap-1">
          {weekDayNames.map(day => <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">{Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </CardContent></Card>
    );
  }

  return (
    <Card><CardContent className="p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayNames.map(day => <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {emptySlots.map((_: any, i: number) => <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[100px] p-1 sm:p-2" />)}
        {daysInMonth.map((day: Date) => {
          const dayEvents = getEventsForDay(day);
          const holiday = getHoliday(day);
          const isShabbat = isSaturday(day);
          const isHolidayOrShabbat = !!holiday || isShabbat;
          const isCurrentDay = isToday(day);
          const dayShifts = getShiftsForDay(formatDateString(day));

          return (
            <div
              key={formatDateString(day)}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border rounded-lg transition-colors cursor-pointer',
                isCurrentDay && 'bg-primary/5 border-primary',
                isHolidayOrShabbat && !isCurrentDay && 'bg-holiday/10',
                !isCurrentDay && !isHolidayOrShabbat && 'hover:bg-muted/50'
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn('text-sm font-medium', isCurrentDay && 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center')}>
                  {format(day, 'd')}
                </span>
                {holiday && <Badge variant="outline" className="text-[8px] sm:text-[10px] px-0.5 sm:px-1 bg-holiday/20 text-holiday border-holiday/30 max-w-[50px] sm:max-w-none truncate">{holiday}</Badge>}
                {isShabbat && !holiday && <Badge variant="outline" className="text-[8px] sm:text-[10px] px-0.5 sm:px-1 bg-holiday/20 text-holiday border-holiday/30">שבת</Badge>}
              </div>
              <div className="space-y-1">
                {dayShifts.length > 0 && (
                  <div className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{dayShifts.length} משמרות</span>
                  </div>
                )}
                {dayEvents.slice(0, 2).map((event: any) => (
                  <div key={event.id} className={cn('text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1',
                    event.type === 'wfh' && 'bg-info/20 text-info',
                    event.type === 'vacation' && 'bg-success/20 text-success'
                  )}>
                    {event.type === 'wfh' ? <Home className="h-2.5 w-2.5 flex-shrink-0" /> : <Palmtree className="h-2.5 w-2.5 flex-shrink-0" />}
                    <span className="truncate">{event.profiles?.full_name || 'משתמש'}</span>
                    {event.status === 'pending' && <Clock className="h-2.5 w-2.5 text-warning flex-shrink-0" />}
                  </div>
                ))}
                {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} נוספים</div>}
              </div>
            </div>
          );
        })}
      </div>
    </CardContent></Card>
  );
}

// ========== WEEK VIEW ==========
function WeekView({ weekDays, getEventsForDay, getHoliday, getShiftsForDay, isLoading, onDayClick }: any) {
  if (isLoading) {
    return <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {weekDays.map((day: Date) => {
        const dateStr = formatDateString(day);
        const dayEvents = getEventsForDay(day);
        const holiday = getHoliday(day);
        const isShabbat = isSaturday(day);
        const isHolidayOrShabbat = !!holiday || isShabbat;
        const isCurrentDay = isToday(day);
        const dayShifts = getShiftsForDay(dateStr);

        return (
          <Card
            key={dateStr}
            onClick={() => onDayClick(day)}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md min-h-[160px] sm:min-h-[200px]',
              isCurrentDay && 'border-primary bg-primary/5',
              isHolidayOrShabbat && !isCurrentDay && 'bg-holiday/5'
            )}
          >
            <CardContent className="p-2 sm:p-3">
              <div className="flex justify-between items-start mb-2 sm:mb-3">
                <div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{HEBREW_DAYS_FULL[day.getDay()]}</div>
                  <div className={cn('text-lg sm:text-xl font-bold', isCurrentDay ? 'text-primary' : 'text-foreground')}>{day.getDate()}</div>
                </div>
                {holiday && <Badge variant="outline" className="text-[8px] sm:text-[9px] bg-holiday/20 text-holiday border-holiday/30 max-w-[60px] truncate">{holiday}</Badge>}
                {isShabbat && !holiday && <Badge variant="outline" className="text-[8px] sm:text-[9px] bg-holiday/20 text-holiday border-holiday/30">שבת</Badge>}
              </div>

              {dayShifts.length > 0 && (
                <div className="mb-2 text-[10px] px-2 py-1 rounded bg-primary/10 text-primary flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{dayShifts.length} משמרות</span>
                </div>
              )}

              <div className="space-y-1">
                {dayEvents.slice(0, 4).map((event: any) => (
                  <div key={event.id} className={cn('text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1',
                    event.type === 'wfh' && 'bg-info/20 text-info',
                    event.type === 'vacation' && 'bg-success/20 text-success'
                  )}>
                    {event.type === 'wfh' ? <Home className="h-2.5 w-2.5 flex-shrink-0" /> : <Palmtree className="h-2.5 w-2.5 flex-shrink-0" />}
                    <span className="truncate">{event.profiles?.full_name || 'משתמש'}</span>
                    {event.status === 'pending' && <Clock className="h-2.5 w-2.5 text-warning flex-shrink-0" />}
                  </div>
                ))}
                {dayEvents.length > 4 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 4} נוספים</div>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ========== DAY VIEW ==========
function DayView({ date, dateStr, events, shifts, holiday, employees, departments, onBackToCalendar }: {
  date: Date;
  dateStr: string;
  events: any[];
  shifts: any[];
  holiday: string | undefined;
  employees: any[];
  departments: any[];
  onBackToCalendar: () => void;
}) {
  const isShabbat = isSaturday(date);
  const wfhEvents = events.filter((e: any) => e.type === 'wfh');
  const vacationEvents = events.filter((e: any) => e.type === 'vacation');

  // Group shifts by department
  const shiftsByDept = useMemo(() => {
    const grouped: Record<string, typeof shifts> = {};
    shifts.forEach(s => {
      const deptId = s.profiles?.department_id || 'none';
      if (!grouped[deptId]) grouped[deptId] = [];
      grouped[deptId].push(s);
    });
    return grouped;
  }, [shifts]);

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={onBackToCalendar} className="gap-2">
        <ArrowRight className="h-3.5 w-3.5" />
        חזרה ללוח השנה
      </Button>

      {(holiday || isShabbat) && (
        <div className="flex items-center gap-2 p-3 bg-holiday/10 rounded-lg border border-holiday/20">
          <span className="text-holiday font-bold">{holiday || 'שבת'}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Shifts - Main Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  📋 משמרות
                  {shifts.length > 0 && <Badge className="bg-primary/10 text-primary">{shifts.length} משובצים</Badge>}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {shifts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">אין משמרות ליום זה</div>
              ) : (
                <div className="space-y-3">
                  {departments.map((dept: any) => {
                    const deptShifts = shiftsByDept[dept.id];
                    if (!deptShifts?.length) return null;
                    return (
                      <div key={dept.id}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold">{dept.name}</span>
                          <span className="text-[10px] text-muted-foreground">({deptShifts.length})</span>
                        </div>
                        <div className="space-y-1">
                          {deptShifts.map((s: any) => (
                            <div key={s.id} className="flex items-center gap-3 py-2 px-3 bg-muted/30 rounded-lg border-r-[3px] border-r-primary">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                  {s.profiles?.full_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="text-sm font-semibold">{s.profiles?.full_name}</div>
                              </div>
                              <Badge variant="outline" className="text-xs" dir="ltr">{s.start_time} — {s.end_time}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Combined WFH + Vacation */}
          {(vacationEvents.length > 0 || wfhEvents.length > 0) ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  👤 חופשה ועבודה מהבית
                  <Badge className="bg-muted text-muted-foreground text-xs">{vacationEvents.length + wfhEvents.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {vacationEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm py-0.5">
                    <Palmtree className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    <span className="flex-1">{e.profiles?.full_name}</span>
                    <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">חופשה</Badge>
                    {e.status === 'pending' && <Clock className="h-3 w-3 text-warning" />}
                  </div>
                ))}
                {wfhEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm py-0.5">
                    <Home className="h-3.5 w-3.5 text-info flex-shrink-0" />
                    <span className="flex-1">{e.profiles?.full_name}</span>
                    <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/30">מהבית</Badge>
                    {e.status === 'pending' && <Clock className="h-3 w-3 text-warning" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">👤 חופשה ועבודה מהבית</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground text-center py-2">כולם במשרד היום 🎉</div>
              </CardContent>
            </Card>
          )}

          <MeetingsCard dateStr={dateStr} />
        </div>
      </div>
    </div>
  );
}

// ========== MEETINGS CARD ==========
function getEventProgress(start: string, end: string): number {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

function MeetingsCard({ dateStr }: { dateStr: string }) {
  const { data: calendarEvents, isLoading, error } = useGoogleCalendarEvents(dateStr);

  const formatTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          פגישות היום
          {calendarEvents && calendarEvents.length > 0 && (
            <Badge className="bg-muted text-muted-foreground text-xs">{calendarEvents.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="text-xs text-destructive text-center py-2">שגיאה בטעינת פגישות</div>
        ) : !calendarEvents || calendarEvents.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-2">אין פגישות מתוכננות</div>
        ) : (
          <div className="space-y-1.5">
            {calendarEvents.map((evt) => {
              const progress = evt.allDay ? 100 : getEventProgress(evt.start, evt.end);
              const isDone = progress >= 100;
              return (
              <div key={evt.id} className={`relative flex items-start gap-2 py-1.5 px-2 rounded-lg overflow-hidden ${isDone ? 'opacity-60' : ''}`}>
                {/* Background */}
                <div className="absolute inset-0 bg-muted/40 rounded-lg" />
                {/* Battery-style progress fill */}
                {!evt.allDay && progress > 0 && (
                  <div
                    className={`absolute inset-y-0 right-0 transition-all duration-1000 ease-linear rounded-lg ${isDone ? 'bg-muted/50' : 'bg-primary/20'}`}
                    style={{ width: `${progress}%` }}
                  />
                )}
                <div className="flex flex-col items-center min-w-[45px] relative z-10">
                  {evt.allDay ? (
                    <span className="text-[10px] text-muted-foreground">כל היום</span>
                  ) : (
                    <>
                      <span className="text-xs font-semibold" dir="ltr">{formatTime(evt.start)}</span>
                      <span className="text-[10px] text-muted-foreground" dir="ltr">{formatTime(evt.end)}</span>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="text-sm font-medium truncate">{evt.summary}</div>
                  {evt.location && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                      {evt.location}
                    </div>
                  )}
                  {evt.attendees && evt.attendees.length > 0 && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Users className="h-2.5 w-2.5 flex-shrink-0" />
                      <span className="truncate">{evt.attendees.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
