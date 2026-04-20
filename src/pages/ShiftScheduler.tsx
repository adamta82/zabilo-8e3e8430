import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfWeek, isSameDay, isToday as isTodayFn } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, Plus, Copy, Trash2, Search, Filter, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift, useBulkCreateShifts, useBulkDeleteShifts } from '@/hooks/useShifts';
import { useEmployees, type EmployeeWithRole } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { ShiftModal } from '@/components/shifts/ShiftModal';
import { EmployeeWeekShiftsDialog } from '@/components/shifts/EmployeeWeekShiftsDialog';
import { useToast } from '@/hooks/use-toast';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2);
}

export default function ShiftScheduler() {
  const [view, setView] = useState<'week' | 'day'>('week');
  const [weekStartDate, setWeekStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedDate, setSelectedDate] = useState(formatDateStr(new Date()));
  const [filterDept, setFilterDept] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{
    employeeId: string;
    employeeName: string;
    date: string;
    shiftId?: string;
    start?: string;
    end?: string;
  } | null>(null);

  const { toast } = useToast();

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i)),
    [weekStartDate]
  );

  const weekStartStr = formatDateStr(weekDays[0]);
  const weekEndStr = formatDateStr(weekDays[6]);

  const { data: shifts, isLoading: shiftsLoading } = useShifts(weekStartStr, weekEndStr);
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: departments } = useDepartments();

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const bulkCreateShifts = useBulkCreateShifts();
  const bulkDeleteShifts = useBulkDeleteShifts();

  const isLoading = shiftsLoading || employeesLoading;

  // Filter employees
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter(e => {
      if ((e as any).show_in_shifts === false) return false;
      if (filterDept !== 'all' && e.department_id !== filterDept) return false;
      if (search && !e.full_name.includes(search)) return false;
      return true;
    });
  }, [employees, filterDept, search]);

  // Get shifts for a specific employee on a specific date
  const getEmployeeShifts = useCallback((employeeId: string, date: string) => {
    if (!shifts) return [];
    return shifts.filter(s => s.employee_id === employeeId && s.date === date);
  }, [shifts]);

  // Navigate
  const navWeek = (dir: number) => {
    setWeekStartDate(prev => addDays(prev, dir * 7));
  };
  const navDay = (dir: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(formatDateStr(d));
    const ws = startOfWeek(d, { weekStartsOn: 0 });
    setWeekStartDate(ws);
  };
  const goToday = () => {
    const now = new Date();
    setSelectedDate(formatDateStr(now));
    setWeekStartDate(startOfWeek(now, { weekStartsOn: 0 }));
  };

  // CRUD handlers
  const handleSaveShift = (start: string, end: string) => {
    if (!modal) return;
    if (modal.shiftId) {
      updateShift.mutate({ id: modal.shiftId, start_time: start, end_time: end });
    } else {
      createShift.mutate({
        employee_id: modal.employeeId,
        date: modal.date,
        start_time: start,
        end_time: end,
      });
    }
  };

  const handleDeleteShift = (shiftId: string) => {
    deleteShift.mutate(shiftId);
  };

  const handleCopyPrevWeek = async () => {
    if (!filteredEmployees.length) return;
    const prevWeekStartStr = formatDateStr(addDays(weekStartDate, -7));
    const prevWeekEndStr = formatDateStr(addDays(weekStartDate, -1));

    // Fetch previous week shifts
    const { data: prevShifts, error } = await supabase
      .from('shifts')
      .select('employee_id, date, start_time, end_time')
      .gte('date', prevWeekStartStr)
      .lte('date', prevWeekEndStr);

    if (error || !prevShifts?.length) {
      toast({ title: 'לא נמצאו משמרות בשבוע הקודם', variant: 'destructive' });
      return;
    }

    // Map prev week dates to current week (add 7 days)
    const newShifts = prevShifts.map(s => {
      const oldDate = new Date(s.date);
      const newDate = addDays(oldDate, 7);
      return {
        employee_id: s.employee_id,
        date: formatDateStr(newDate),
        start_time: s.start_time,
        end_time: s.end_time,
      };
    });

    bulkCreateShifts.mutate(newShifts);
  };

  const handleClearDay = (dateStr: string) => {
    if (!shifts) return;
    const dayShifts = shifts.filter(s => s.date === dateStr);
    if (dayShifts.length === 0) return;
    bulkDeleteShifts.mutate(dayShifts.map(s => s.id));
    toast({ title: 'המשמרות נוקו' });
  };

  // Stats per day
  const weekAssignment = useMemo(() => {
    return weekDays.map(d => {
      const ds = formatDateStr(d);
      const assigned = filteredEmployees.filter(e => getEmployeeShifts(e.id, ds).length > 0).length;
      return { date: ds, day: d, assigned, total: filteredEmployees.length, unassigned: filteredEmployees.length - assigned };
    });
  }, [weekDays, filteredEmployees, getEmployeeShifts]);

  // Get department info
  const getDeptForEmployee = (emp: EmployeeWithRole) => {
    return departments?.find(d => d.id === emp.department_id);
  };

  const headerDate = view === 'week'
    ? `${format(weekDays[0], 'd בMMM', { locale: he })} — ${format(weekDays[6], 'd בMMM yyyy', { locale: he })}`
    : format(new Date(selectedDate), 'EEEE, d בMMMM yyyy', { locale: he });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {[{ key: 'week', label: 'שבוע' }, { key: 'day', label: 'יום' }].map(v => (
                <Button
                  key={v.key}
                  variant={view === v.key ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setView(v.key as 'week' | 'day')}
                >
                  {v.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => view === 'week' ? navWeek(1) : navDay(1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToday}>היום</Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => view === 'week' ? navWeek(-1) : navDay(-1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>

            <span className="text-sm font-semibold">{headerDate}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCopyPrevWeek}>
              <Copy className="h-3 w-3 ml-1" /> העתק שבוע קודם
            </Button>
            {view === 'day' && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleClearDay(selectedDate)}>
                <Trash2 className="h-3 w-3 ml-1" /> נקה יום
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-40">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="חיפוש עובד..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pr-8 text-xs"
            />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-40 h-7 text-xs">
              <Filter className="h-3 w-3 ml-1" />
              <SelectValue placeholder="כל המחלקות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המחלקות</SelectItem>
              {departments?.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* WEEK VIEW */}
          {view === 'week' && (
            <div className="space-y-3">
              {/* Assignment overview */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {weekAssignment.map(wa => {
                  const isToday = isTodayFn(wa.day);
                  const isSel = wa.date === selectedDate;
                  const pct = wa.total > 0 ? (wa.assigned / wa.total) * 100 : 0;
                  return (
                    <div
                      key={wa.date}
                      onClick={() => { setSelectedDate(wa.date); setView('day'); }}
                      className={cn(
                        'flex-1 min-w-[100px] p-2.5 rounded-lg cursor-pointer transition-all border-2',
                        isToday ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-transparent hover:border-primary/30',
                        isSel && !isToday && 'border-primary/50'
                      )}
                    >
                      <div className={cn('text-[11px] font-medium mb-1', isToday ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {HEBREW_DAYS[wa.day.getDay()]} {wa.day.getDate()}
                      </div>
                      <div className={cn('h-1 rounded-full mb-1.5 overflow-hidden', isToday ? 'bg-primary-foreground/25' : 'bg-muted')}>
                        <div
                          className={cn('h-full rounded-full transition-all', wa.unassigned === 0 ? (isToday ? 'bg-primary-foreground' : 'bg-success') : 'bg-warning')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[11px] font-semibold', isToday ? 'text-primary-foreground' : 'text-foreground')}>
                          {wa.assigned}/{wa.total}
                        </span>
                        {wa.unassigned > 0 && (
                          <Badge variant="outline" className={cn('text-[9px] px-1 py-0', isToday ? 'border-primary-foreground/30 text-primary-foreground' : 'border-warning/30 text-warning')}>
                            {wa.unassigned} חסר
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Week table */}
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-right p-2.5 w-[180px] text-xs font-semibold text-muted-foreground">עובד</th>
                        {weekDays.map(d => {
                          const ds = formatDateStr(d);
                          const isToday = isTodayFn(d);
                          return (
                            <th
                              key={ds}
                              className={cn(
                                'p-2 text-center cursor-pointer transition-colors',
                                isToday ? 'bg-primary/10' : 'hover:bg-muted/50'
                              )}
                              onClick={() => { setSelectedDate(ds); setView('day'); }}
                            >
                              <div className="text-[11px] text-muted-foreground">{HEBREW_DAYS[d.getDay()]}</div>
                              <div className={cn('text-base font-bold', isToday ? 'text-primary' : 'text-foreground')}>{d.getDate()}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Group by department */}
                      {departments?.filter(d => filterDept === 'all' || filterDept === d.id).map(dept => {
                        const emps = filteredEmployees.filter(e => e.department_id === dept.id);
                        if (!emps.length) return null;
                        return (
                          <DepartmentGroup
                            key={dept.id}
                            deptName={dept.name}
                            deptIcon={dept.icon}
                            employees={emps}
                            weekDays={weekDays}
                            getEmployeeShifts={getEmployeeShifts}
                            onAddShift={(empId, empName, date) => setModal({ employeeId: empId, employeeName: empName, date })}
                            onEditShift={(empId, empName, date, shiftId, start, end) => setModal({ employeeId: empId, employeeName: empName, date, shiftId, start, end })}
                            onDeleteShift={handleDeleteShift}
                          />
                        );
                      })}
                      {/* Unassigned employees */}
                      {filteredEmployees.filter(e => !e.department_id).length > 0 && (
                        <DepartmentGroup
                          deptName="ללא מחלקה"
                          deptIcon={null}
                          employees={filteredEmployees.filter(e => !e.department_id)}
                          weekDays={weekDays}
                          getEmployeeShifts={getEmployeeShifts}
                          onAddShift={(empId, empName, date) => setModal({ employeeId: empId, employeeName: empName, date })}
                          onEditShift={(empId, empName, date, shiftId, start, end) => setModal({ employeeId: empId, employeeName: empName, date, shiftId, start, end })}
                          onDeleteShift={handleDeleteShift}
                        />
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* DAY VIEW */}
          {view === 'day' && (
            <div className="space-y-4">
              {/* Day chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {weekDays.map(d => {
                  const ds = formatDateStr(d);
                  const isToday = isTodayFn(d);
                  const isSel = ds === selectedDate;
                  const unassigned = filteredEmployees.filter(e => getEmployeeShifts(e.id, ds).length === 0).length;
                  return (
                    <Button
                      key={ds}
                      variant={isSel ? 'default' : isToday ? 'secondary' : 'outline'}
                      size="sm"
                      className="relative min-w-[60px] h-auto py-1.5 flex-col gap-0"
                      onClick={() => setSelectedDate(ds)}
                    >
                      <span className="text-[10px]">{HEBREW_DAYS[d.getDay()]}</span>
                      <span className="text-base font-bold">{d.getDate()}</span>
                      {unassigned > 0 && (
                        <Badge className="absolute -top-1.5 -left-1.5 h-4 w-4 p-0 text-[9px] flex items-center justify-center bg-warning text-warning-foreground">
                          {unassigned}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>

              {/* Unassigned alert */}
              <UnassignedPanel
                employees={filteredEmployees.filter(e => getEmployeeShifts(e.id, selectedDate).length === 0)}
                departments={departments || []}
                onAssign={(empId, empName) => setModal({ employeeId: empId, employeeName: empName, date: selectedDate })}
              />

              {/* Assigned by department */}
              {departments?.filter(d => filterDept === 'all' || filterDept === d.id).map(dept => {
                const emps = filteredEmployees.filter(e =>
                  e.department_id === dept.id &&
                  getEmployeeShifts(e.id, selectedDate).length > 0
                );
                if (!emps.length) return null;
                return (
                  <div key={dept.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{dept.name}</span>
                      <span className="text-xs text-muted-foreground">({emps.length} משובצים)</span>
                      <span className="text-xs text-muted-foreground">({emps.length} משובצים)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {emps.map(emp => {
                        const empShifts = getEmployeeShifts(emp.id, selectedDate);
                        const totalH = empShifts.reduce((a, s) => a + (timeToMin(s.end_time) - timeToMin(s.start_time)) / 60, 0);
                        return (
                          <Card key={emp.id} className="hover:border-primary/30 transition-colors">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                      {getInitials(emp.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="text-sm font-semibold">{emp.full_name}</div>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">{totalH.toFixed(1)}h</Badge>
                              </div>
                              <div className="space-y-1">
                                {empShifts.map(s => (
                                  <div key={s.id} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded px-2 py-1 border-r-[3px] border-r-primary">
                                    <span className="text-xs font-semibold text-primary" dir="ltr">{s.start_time} — {s.end_time}</span>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setModal({ employeeId: emp.id, employeeName: emp.full_name, date: selectedDate, shiftId: s.id, start: s.start_time, end: s.end_time })}
                                        className="text-[10px] text-muted-foreground hover:text-primary"
                                      >✏️</button>
                                      <button
                                        onClick={() => handleDeleteShift(s.id)}
                                        className="text-[10px] text-muted-foreground hover:text-destructive"
                                      >🗑️</button>
                                    </div>
                                  </div>
                                ))}
                                <button
                                  onClick={() => setModal({ employeeId: emp.id, employeeName: emp.full_name, date: selectedDate })}
                                  className="w-full border border-dashed border-border rounded px-2 py-1 text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                                >
                                  + הוסף משמרת
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <ShiftModal
          open={!!modal}
          onOpenChange={(open) => !open && setModal(null)}
          employeeName={modal.employeeName}
          dateLabel={format(new Date(modal.date), 'EEEE, d בMMMM', { locale: he })}
          initialStart={modal.start}
          initialEnd={modal.end}
          isEdit={!!modal.shiftId}
          onSave={handleSaveShift}
        />
      )}
    </div>
  );
}

// Department group for week table
function DepartmentGroup({
  deptName,
  deptIcon,
  employees,
  weekDays,
  getEmployeeShifts,
  onAddShift,
  onEditShift,
  onDeleteShift,
}: {
  deptName: string;
  deptIcon: string | null;
  employees: EmployeeWithRole[];
  weekDays: Date[];
  getEmployeeShifts: (empId: string, date: string) => any[];
  onAddShift: (empId: string, empName: string, date: string) => void;
  onEditShift: (empId: string, empName: string, date: string, shiftId: string, start: string, end: string) => void;
  onDeleteShift: (shiftId: string) => void;
}) {
  return (
    <>
      <tr className="bg-muted/30 border-t border-border">
        <td colSpan={8} className="px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">{deptName}</span>
            <span className="text-[10px] text-muted-foreground">({employees.length})</span>
          </div>
        </td>
      </tr>
      {employees.map(emp => (
        <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
          <td className="p-2 border-l border-border/30">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {getInitials(emp.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{emp.full_name}</div>
              </div>
            </div>
          </td>
          {weekDays.map(d => {
            const ds = formatDateStr(d);
            const dayShifts = getEmployeeShifts(emp.id, ds);
            const isToday = isTodayFn(d);
            return (
              <td key={ds} className={cn('p-1 border-l border-border/30', isToday && 'bg-primary/5')}>
                {dayShifts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[40px] gap-0.5">
                    <span className="text-[10px] text-warning font-medium">לא במשמרת</span>
                    <button
                      onClick={() => onAddShift(emp.id, emp.full_name, ds)}
                      className="border border-dashed border-border rounded text-[9px] px-2 py-0.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >+ שבץ</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {dayShifts.map(s => (
                      <div
                        key={s.id}
                        onClick={() => onEditShift(emp.id, emp.full_name, ds, s.id, s.start_time, s.end_time)}
                        className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5 border-r-2 border-r-primary cursor-pointer hover:shadow-sm transition-shadow"
                      >
                        <span className="text-[10px] font-semibold text-primary" dir="ltr">{s.start_time}–{s.end_time}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteShift(s.id); }}
                          className="text-[8px] text-muted-foreground/50 hover:text-destructive"
                        >✕</button>
                      </div>
                    ))}
                    <button
                      onClick={() => onAddShift(emp.id, emp.full_name, ds)}
                      className="text-[9px] text-muted-foreground/60 hover:text-primary transition-colors"
                    >+ הוסף</button>
                  </div>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

// Unassigned panel
function UnassignedPanel({
  employees,
  departments,
  onAssign,
}: {
  employees: EmployeeWithRole[];
  departments: { id: string; name: string; icon: string | null }[];
  onAssign: (empId: string, empName: string) => void;
}) {
  if (employees.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg border border-success/20">
        <span>✅</span>
        <span className="text-sm font-semibold text-success">כל העובדים משובצים ליום זה</span>
      </div>
    );
  }

  const grouped: Record<string, EmployeeWithRole[]> = {};
  employees.forEach(e => {
    const key = e.department_id || 'none';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span>⚠️</span>
          <span className="text-sm font-bold text-warning">לא משובצים</span>
          <Badge className="bg-warning text-warning-foreground text-xs">{employees.length}</Badge>
        </div>
        <div className="space-y-2">
          {Object.entries(grouped).map(([deptId, emps]) => {
            const dept = departments.find(d => d.id === deptId);
            return (
              <div key={deptId}>
                {dept && (
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                    {dept.name}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {emps.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => onAssign(emp.id, emp.full_name)}
                      className="flex items-center gap-2 px-2.5 py-1.5 bg-card border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-right"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                          {getInitials(emp.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-xs font-semibold">{emp.full_name}</div>
                        <div className="text-[9px] text-muted-foreground">לחץ לשיבוץ →</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
