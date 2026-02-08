import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, Clock, Home, Palmtree, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Israeli holidays for demonstration (static for now)
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

// Mock data for demonstration
const mockEvents = [
  { id: '1', date: '2026-02-08', type: 'wfh' as const, userName: 'יוסי כהן', status: 'approved' as const },
  { id: '2', date: '2026-02-09', type: 'vacation' as const, userName: 'שרה לוי', status: 'approved' as const },
  { id: '3', date: '2026-02-10', type: 'wfh' as const, userName: 'דני אברהם', status: 'pending' as const },
  { id: '4', date: '2026-02-12', type: 'vacation' as const, userName: 'רחל גולד', status: 'approved' as const },
];

const weekDays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the first day of the month (0 = Sunday, 6 = Saturday)
  const startDayOfWeek = getDay(monthStart);

  // Create empty slots for days before the first day of the month
  const emptySlots = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return mockEvents.filter(event => event.date === dateStr);
  };

  const getHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return israeliHolidays[dateStr];
  };

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
              <SelectItem value="dev">פיתוח</SelectItem>
              <SelectItem value="marketing">שיווק</SelectItem>
              <SelectItem value="hr">משאבי אנוש</SelectItem>
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
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots before first day */}
            {emptySlots.map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[100px] p-2" />
            ))}

            {/* Calendar days */}
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
                        <span className="truncate">{event.userName}</span>
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
            <div className="text-2xl font-bold text-info">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              בחופשה היום
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              בקשות ממתינות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              החג הקרוב
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-holiday">פורים</div>
            <div className="text-xs text-muted-foreground">17 במרץ</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
