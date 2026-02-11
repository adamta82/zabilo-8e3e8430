import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay, isWithinInterval, isSaturday } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, Clock, Home, Palmtree, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRequests } from '@/hooks/useRequests';
import { useDepartments } from '@/hooks/useDepartments';

// Helper to format date to YYYY-MM-DD in local time (avoids timezone shifts)
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to parse YYYY-MM-DD string into a local Date object
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Israeli holidays - comprehensive list for 2025-2027
const israeliHolidays: Record<string, string> = {
  // 2025 (verified via hebcal.com, Israel schedule)
  '2025-03-14': 'פורים',
  '2025-04-12': 'ערב פסח',
  '2025-04-13': 'פסח',
  '2025-04-14': 'פסח',
  '2025-04-19': 'שביעי של פסח',
  '2025-04-30': 'יום הזיכרון',
  '2025-05-01': 'יום העצמאות',
  '2025-06-02': 'שבועות',
  '2025-09-23': 'ראש השנה',
  '2025-09-24': 'ראש השנה',
  '2025-10-02': 'יום כיפור',
  '2025-10-07': 'סוכות',
  '2025-10-08': 'סוכות',
  '2025-10-13': 'הושענא רבה',
  '2025-10-14': 'שמחת תורה',
  '2025-12-15': 'חנוכה',
  '2025-12-16': 'חנוכה',
  '2025-12-17': 'חנוכה',
  '2025-12-18': 'חנוכה',
  '2025-12-19': 'חנוכה',
  '2025-12-20': 'חנוכה',
  '2025-12-21': 'חנוכה',
  '2025-12-22': 'חנוכה',
  // 2026
  '2026-03-03': 'פורים',
  '2026-04-01': 'ערב פסח',
  '2026-04-02': 'פסח',
  '2026-04-03': 'פסח',
  '2026-04-08': 'שביעי של פסח',
  '2026-04-21': 'יום הזיכרון',
  '2026-04-22': 'יום העצמאות',
  '2026-05-22': 'שבועות',
  '2026-09-12': 'ראש השנה',
  '2026-09-13': 'ראש השנה',
  '2026-09-21': 'יום כיפור',
  '2026-09-26': 'סוכות',
  '2026-09-27': 'סוכות',
  '2026-10-02': 'הושענא רבה',
  '2026-10-03': 'שמחת תורה',
  '2026-12-05': 'חנוכה',
  '2026-12-06': 'חנוכה',
  '2026-12-07': 'חנוכה',
  '2026-12-08': 'חנוכה',
  '2026-12-09': 'חנוכה',
  '2026-12-10': 'חנוכה',
  '2026-12-11': 'חנוכה',
  '2026-12-12': 'חנוכה',
  // 2027
  '2027-03-23': 'פורים',
  '2027-04-21': 'ערב פסח',
  '2027-04-22': 'פסח',
  '2027-04-23': 'פסח',
  '2027-04-28': 'שביעי של פסח',
  '2027-05-11': 'יום הזיכרון',
  '2027-05-12': 'יום העצמאות',
  '2027-06-11': 'שבועות',
  '2027-10-02': 'ראש השנה',
  '2027-10-03': 'ראש השנה',
  '2027-10-11': 'יום כיפור',
  '2027-10-16': 'סוכות',
  '2027-10-17': 'סוכות',
  '2027-10-22': 'הושענא רבה',
  '2027-10-23': 'שמחת תורה',
};

const weekDays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  
  const { data: requests, isLoading: requestsLoading } = useRequests();
  const { data: departments, isLoading: departmentsLoading } = useDepartments();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = getDay(monthStart);
  const emptySlots = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Filter and map requests to calendar events
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
      if (request.type === 'wfh') {
        return request.wfh_date === dateStr;
      }
      if (request.type === 'vacation' && request.vacation_start_date && request.vacation_end_date) {
        const start = parseLocalDate(request.vacation_start_date);
        const end = parseLocalDate(request.vacation_end_date);
        return isWithinInterval(date, { start, end });
      }
      return false;
    });
  };

  const getHoliday = (date: Date) => {
    const dateStr = formatDateString(date);
    return israeliHolidays[dateStr];
  };

  // Calculate stats
  const todayStr = formatDateString(new Date());
  const stats = useMemo(() => {
    if (!requests) return { wfhToday: 0, vacationToday: 0, pending: 0, nextHoliday: null as { date: Date; name: string } | null };

    const wfhToday = requests.filter(r => 
      r.type === 'wfh' && 
      r.wfh_date === todayStr && 
      r.status === 'approved'
    ).length;

    const vacationToday = requests.filter(r => {
      if (r.type !== 'vacation' || r.status !== 'approved') return false;
      if (!r.vacation_start_date || !r.vacation_end_date) return false;
      const today = new Date();
      return isWithinInterval(today, {
        start: parseLocalDate(r.vacation_start_date),
        end: parseLocalDate(r.vacation_end_date),
      });
    }).length;

    const pending = requests.filter(r => r.status === 'pending').length;

    // Find next holiday
    const today = new Date();
    const todayDateStr = formatDateString(today);
    const futureHolidays = Object.entries(israeliHolidays)
      .filter(([date]) => date > todayDateStr)
      .map(([date, name]) => ({ date: parseLocalDate(date), name }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const nextHoliday = futureHolidays[0] || null;

    return { wfhToday, vacationToday, pending, nextHoliday };
  }, [requests, todayStr]);

  const isLoading = requestsLoading || departmentsLoading;

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: he })}
            </h2>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            היום
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 ml-2" />
              <SelectValue placeholder="כל המחלקות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המחלקות</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-info" />
          <span>עבודה מהבית</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-success" />
          <span>חופשה</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-holiday" />
          <span>חג / שבת</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-warning" />
          <span>ממתין לאישור</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {emptySlots.map((_, index) => (
                  <div key={`empty-${index}`} className="min-h-[60px] sm:min-h-[100px] p-1 sm:p-2" />
                ))}

                {daysInMonth.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const holiday = getHoliday(day);
                  const isShabbat = isSaturday(day);
                  const isHolidayOrShabbat = !!holiday || isShabbat;
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={formatDateString(day)}
                      className={cn(
                        'min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border rounded-lg transition-colors',
                        isCurrentDay && 'bg-primary/5 border-primary',
                        isHolidayOrShabbat && !isCurrentDay && 'bg-holiday/10',
                        !isCurrentDay && !isHolidayOrShabbat && 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isCurrentDay && 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                       {holiday && (
                          <Badge variant="outline" className="text-[8px] sm:text-[10px] px-0.5 sm:px-1 bg-holiday/20 text-holiday border-holiday/30 max-w-[50px] sm:max-w-none truncate">
                            {holiday}
                          </Badge>
                        )}
                        {isShabbat && !holiday && (
                          <Badge variant="outline" className="text-[8px] sm:text-[10px] px-0.5 sm:px-1 bg-holiday/20 text-holiday border-holiday/30">
                            שבת
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1',
                              event.type === 'wfh' && 'bg-info/20 text-info',
                              event.type === 'vacation' && 'bg-success/20 text-success'
                            )}
                          >
                            {event.type === 'wfh' ? (
                              <Home className="h-2.5 w-2.5 flex-shrink-0" />
                            ) : (
                              <Palmtree className="h-2.5 w-2.5 flex-shrink-0" />
                            )}
                            <span className="truncate">{event.profiles?.full_name || 'משתמש'}</span>
                            {event.status === 'pending' && (
                              <Clock className="h-2.5 w-2.5 text-warning flex-shrink-0" />
                            )}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{dayEvents.length - 3} נוספים
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              עובדים מהבית היום
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.wfhToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              בחופשה היום
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.vacationToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              בקשות ממתינות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              החג הקרוב
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.nextHoliday ? (
              <>
                <div className="text-lg font-bold text-holiday">{stats.nextHoliday.name}</div>
                <div className="text-xs text-muted-foreground">
                  {format(stats.nextHoliday.date, 'dd בMMMM', { locale: he })}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
