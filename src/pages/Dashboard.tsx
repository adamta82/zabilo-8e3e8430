import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay, parseISO, isWithinInterval } from 'date-fns';
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

// Israeli holidays for 2026
const israeliHolidays: Record<string, string> = {
  '2026-03-17': 'פורים',
  '2026-04-06': 'פסח',
  '2026-04-12': 'שביעי של פסח',
  '2026-04-20': 'יום הזיכרון',
  '2026-04-21': 'יום העצמאות',
  '2026-05-26': 'שבועות',
  '2026-09-23': 'ראש השנה',
  '2026-10-02': 'יום כיפור',
  '2026-10-07': 'סוכות',
  '2026-10-14': 'שמחת תורה',
  '2026-12-15': 'חנוכה',
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
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return calendarEvents.filter(request => {
      if (request.type === 'wfh') {
        return request.wfh_date === dateStr;
      }
      if (request.type === 'vacation' && request.vacation_start_date && request.vacation_end_date) {
        const start = parseISO(request.vacation_start_date);
        const end = parseISO(request.vacation_end_date);
        return isWithinInterval(date, { start, end });
      }
      return false;
    });
  };

  const getHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return israeliHolidays[dateStr];
  };

  // Calculate stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const stats = useMemo(() => {
    if (!requests) return { wfhToday: 0, vacationToday: 0, pending: 0, nextHoliday: null };

    const wfhToday = requests.filter(r => 
      r.type === 'wfh' && 
      r.wfh_date === todayStr && 
      r.status === 'approved'
    ).length;

    const vacationToday = requests.filter(r => {
      if (r.type !== 'vacation' || r.status !== 'approved') return false;
      if (!r.vacation_start_date || !r.vacation_end_date) return false;
      return isWithinInterval(new Date(), {
        start: parseISO(r.vacation_start_date),
        end: parseISO(r.vacation_end_date),
      });
    }).length;

    const pending = requests.filter(r => r.status === 'pending').length;

    // Find next holiday
    const today = new Date();
    const futureHolidays = Object.entries(israeliHolidays)
      .map(([date, name]) => ({ date: parseISO(date), name }))
      .filter(h => h.date > today)
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
          <span>חג</span>
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
                  <div key={`empty-${index}`} className="min-h-[100px] p-2" />
                ))}

                {daysInMonth.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const holiday = getHoliday(day);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'min-h-[100px] p-2 border rounded-lg transition-colors',
                        isCurrentDay && 'bg-primary/5 border-primary',
                        holiday && 'bg-holiday/10',
                        !isCurrentDay && !holiday && 'hover:bg-muted/50'
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
                          <Badge variant="outline" className="text-[10px] px-1 bg-holiday/20 text-holiday border-holiday/30">
                            {holiday}
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
