import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CopyPlus,
  Eraser,
  Palette,
  Plus,
  Share2,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { RoleManager } from '@/components/shifts/planner/RoleManager';
import { PlannerHistory } from '@/components/shifts/planner/PlannerHistory';
import { EmployeeWeekShiftsDialog } from '@/components/shifts/EmployeeWeekShiftsDialog';
import { useWfhDates } from '@/hooks/useWfhDates';

import {
  useShiftRoles,
  useShiftSlots,
  useShiftCells,
  useAllShiftCells,
  useShiftCellActions,
  useSaveShiftRole,
  useDeleteShiftRole,
  useSaveShiftSlot,
  useDeleteShiftSlot,
  useShiftWeekNotes,
  useSaveShiftWeekNote,
} from '@/hooks/useShiftPlanner';
import {
  PLANNER_LANG_BUTTONS,
  PLANNER_STRINGS,
  addDaysTo,
  addMinutesStr,
  blocksFor,
  computeStats,
  isoDate,
  makeDeltaFormatter,
  makeHourFormatter,
  parseLocalDate,
  shortDate,
  sundayOf,
  textOn,
  type PlannerGrid,
  type PlannerLang,
} from '@/lib/shift-planner';

const LANG_KEY = 'shift-planner-lang';

export default function ShiftScheduler() {
  const { toast } = useToast();
  const { canManageShifts } = useAuth();

  const [lang, setLang] = useState<PlannerLang>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(LANG_KEY) : null;
    return saved === 'en' || saved === 'fr' ? saved : 'he';
  });
  const t = PLANNER_STRINGS[lang];
  const fmtH = useMemo(() => makeHourFormatter(lang), [lang]);
  const fmtDelta = useMemo(() => makeDeltaFormatter(fmtH), [fmtH]);

  const [weekStart, setWeekStart] = useState(() => isoDate(sundayOf(new Date())));
  const [dayIndex, setDayIndex] = useState(() => new Date().getDay());
  const [view, setView] = useState<'planning' | 'history'>('planning');
  const [share, setShare] = useState(false);
  const [editingSlots, setEditingSlots] = useState(false);
  const [managingRoles, setManagingRoles] = useState(false);
  const [brush, setBrush] = useState<string | null>(null);
  const dragging = useRef(false);

  const dates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => isoDate(addDaysTo(parseLocalDate(weekStart), i))),
    [weekStart]
  );
  const prevWeekStart = useMemo(() => isoDate(addDaysTo(parseLocalDate(weekStart), -7)), [weekStart]);
  const prevDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => isoDate(addDaysTo(parseLocalDate(prevWeekStart), i))),
    [prevWeekStart]
  );
  const currentDate = dates[dayIndex];

  const { data: roles = [], isLoading: rolesLoading } = useShiftRoles();
  const { data: slots = [], isLoading: slotsLoading } = useShiftSlots();
  const { data: cells = [], isLoading: cellsLoading } = useShiftCells(dates[0], dates[6]);
  const { data: prevCells = [] } = useShiftCells(prevDates[0], prevDates[6]);
  const { data: allCells = [] } = useAllShiftCells(view === 'history');
  const { data: employeesData, isLoading: employeesLoading } = useEmployees();
  const { data: weekNotes = [] } = useShiftWeekNotes();

  const actions = useShiftCellActions(dates[0], dates[6]);
  const saveRole = useSaveShiftRole();
  const deleteRole = useDeleteShiftRole();
  const saveSlot = useSaveShiftSlot();
  const deleteSlot = useDeleteShiftSlot();
  const saveNote = useSaveShiftWeekNote();

  const employees = useMemo(
    () => (employeesData || []).filter((e) => e.show_in_shifts !== false),
    [employeesData]
  );

  useEffect(() => {
    if (!brush && roles.length) setBrush(roles.find((r) => !r.is_off)?.id ?? roles[0].id);
  }, [roles, brush]);

  useEffect(() => {
    window.localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  const toGrid = (list: typeof cells): PlannerGrid => {
    const g: PlannerGrid = {};
    list.forEach((c) => {
      g[c.date] = g[c.date] || {};
      g[c.date][c.employee_id] = g[c.date][c.employee_id] || {};
      g[c.date][c.employee_id][c.slot_id] = c.role_id;
    });
    return g;
  };

  const grid = useMemo(() => toGrid(cells), [cells]);
  const prevGrid = useMemo(() => toGrid(prevCells), [prevCells]);
  const employeeIds = useMemo(() => employees.map((e) => e.id), [employees]);

  const stats = useMemo(
    () => computeStats(grid, dates, employeeIds, roles, slots),
    [grid, dates, employeeIds, roles, slots]
  );
  const prevStats = useMemo(
    () => computeStats(prevGrid, prevDates, employeeIds, roles, slots),
    [prevGrid, prevDates, employeeIds, roles, slots]
  );
  const hasPrev = prevCells.length > 0;

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const noteForWeek = weekNotes.find((n) => n.week_start === weekStart)?.note ?? '';
  const [noteDraft, setNoteDraft] = useState(noteForWeek);
  useEffect(() => setNoteDraft(noteForWeek), [noteForWeek, weekStart]);

  /* ---------------- painting ---------------- */

  const paint = useCallback(
    (employeeId: string, slotId: string) => {
      if (!canManageShifts || editingSlots) return;
      const existing = grid[currentDate]?.[employeeId]?.[slotId];
      const next = brush;
      if (existing === next) return;
      actions.setCell(currentDate, employeeId, slotId, next);
    },
    [actions, brush, canManageShifts, currentDate, editingSlots, grid]
  );

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || editingSlots || !canManageShifts) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const emp = el?.dataset?.emp;
    const slot = el?.dataset?.slot;
    if (emp && slot) paint(emp, slot);
  };

  /* ---------------- day actions ---------------- */

  const copyPreviousDay = async () => {
    const srcIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    const ok = await actions.copyDay(dates[srcIndex], currentDate);
    toast({ title: ok ? t.copiedFrom(t.days[srcIndex]) : t.noPrevWeek });
  };

  const duplicatePrevWeek = async () => {
    const ok = await actions.duplicateWeek(prevDates, dates);
    toast({ title: ok ? t.duplicated : t.noPrevWeek });
  };

  const whatsappText = useMemo(() => {
    const dayGrid = grid[currentDate] || {};
    const lines = [t.waTitle(t.days[dayIndex], shortDate(parseLocalDate(currentDate), t.locale)), ''];
    employees.forEach((emp) => {
      const bl = blocksFor(dayGrid, emp.id, roles, slots);
      if (!bl.length) return;
      const h = bl.reduce((a, b) => a + b.hours, 0);
      lines.push(
        `${emp.full_name} · ` +
          bl.map((b) => `${b.start}–${b.end} ${roleById.get(b.roleId)?.name ?? ''}`).join(' + ') +
          ` · ${fmtH(h)}`
      );
    });
    lines.push('', `${t.waTotal}: ${fmtH(stats.dayTotals[currentDate] || 0)}`);
    return lines.join('\n');
  }, [grid, currentDate, dayIndex, employees, roles, slots, roleById, stats, t, fmtH]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      toast({ title: t.textCopied });
    } catch {
      toast({ title: t.clipboardDenied, variant: 'destructive' });
    }
  };

  const isLoading = rolesLoading || slotsLoading || cellsLoading || employeesLoading;

  const weekTitle = t.weekOf(
    shortDate(parseLocalDate(dates[0]), t.locale),
    shortDate(parseLocalDate(dates[6]), t.locale)
  );

  const LangSwitch = (
    <div className="flex gap-1">
      {PLANNER_LANG_BUTTONS.map((l) => (
        <Button
          key={l.id}
          size="sm"
          variant={lang === l.id ? 'default' : 'outline'}
          onClick={() => setLang(l.id)}
          title={t.language}
          className="h-8 px-2.5 text-xs"
        >
          {l.label}
        </Button>
      ))}
    </div>
  );

  const cellStyle = (roleId?: string) => {
    const role = roleId ? roleById.get(roleId) : undefined;
    if (!role) return { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' };
    return { background: role.color, color: textOn(role.color) };
  };

  /* ---------------- share view ---------------- */

  if (share) {
    const dayGrid = grid[currentDate] || {};
    const active = employees.filter((e) => (stats.byEmpDay[currentDate] || {})[e.id] > 0);
    const shown = active.length ? active : employees;
    return (
      <div className="space-y-4" dir={t.rtl ? 'rtl' : 'ltr'}>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShare(false)}>
            {t.backToEdit}
          </Button>
          <Button size="sm" onClick={copyText} className="gap-1.5">
            <Copy className="h-4 w-4" />
            {t.copyAsText}
          </Button>
          {LangSwitch}
        </div>

        <Card className="border-2">
          <CardHeader className="flex-row flex-wrap items-baseline justify-between gap-2">
            <CardTitle className="text-xl">
              {t.days[dayIndex]} {shortDate(parseLocalDate(currentDate), t.locale)}
            </CardTitle>
            <span className="text-xs text-muted-foreground">{weekTitle}</span>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr className="bg-muted/60">
                  <th className="border border-border px-2 py-1.5" />
                  {shown.map((e) => (
                    <th key={e.id} className="min-w-[76px] border border-border px-2 py-1.5 font-semibold">
                      {e.full_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <td className="whitespace-nowrap border border-border bg-muted/40 px-2 py-1 text-end text-[11px]">
                      {slot.start_time} – {slot.end_time}
                    </td>
                    {shown.map((e) => {
                      const roleId = dayGrid[e.id]?.[slot.id];
                      return (
                        <td
                          key={e.id}
                          className="border border-border px-1 py-1 text-center text-[11px]"
                          style={cellStyle(roleId)}
                        >
                          {roleId ? roleById.get(roleId)?.name : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td className="border border-border bg-muted/40 px-2 py-1.5 text-end text-[11px] font-bold">
                    {t.dayTotal}
                  </td>
                  {shown.map((e) => (
                    <td key={e.id} className="border border-border bg-muted/30 px-1 py-1.5 text-center font-bold">
                      {fmtH((stats.byEmpDay[currentDate] || {})[e.id] || 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-border bg-muted/40 px-2 py-1.5 text-end text-[11px] font-bold">
                    {t.weekTotal}
                  </td>
                  {shown.map((e) => (
                    <td
                      key={e.id}
                      className="border border-border bg-muted/30 px-1 py-1.5 text-center text-muted-foreground"
                    >
                      {fmtH(stats.byEmp[e.id] || 0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              {t.present(shown.length, fmtH(stats.dayTotals[currentDate] || 0))}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------- main view ---------------- */

  return (
    <div className="space-y-4" dir={t.rtl ? 'rtl' : 'ltr'}>
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title={t.prevWeek}
            onClick={() => setWeekStart(prevWeekStart)}
          >
            {t.rtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{weekTitle}</h1>
            <p className="text-xs text-muted-foreground">
              {fmtH(stats.total)} {t.planned} · {stats.headcount} {t.people} ·{' '}
              {hasPrev ? `${fmtDelta(stats.total - prevStats.total)} ${t.vsPrevWeek}` : t.noCompare}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title={t.nextWeek}
            onClick={() => setWeekStart(isoDate(addDaysTo(parseLocalDate(weekStart), 7)))}
          >
            {t.rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(isoDate(sundayOf(new Date())))}>
            {t.thisWeek}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'planning' | 'history')}>
            <TabsList className="h-9">
              <TabsTrigger value="planning" className="text-xs">
                {t.planning}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                {t.history}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShare(true)}>
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t.shareView}</span>
          </Button>
          {LangSwitch}
        </div>
      </div>

      {view === 'history' ? (
        <PlannerHistory
          t={t}
          fmtH={fmtH}
          fmtDelta={fmtDelta}
          cells={allCells}
          roles={roles}
          slots={slots}
          notes={weekNotes}
          onOpenWeek={(ws) => {
            setWeekStart(ws);
            setView('planning');
          }}
        />
      ) : (
        <>
          {/* day picker */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {t.days.map((d, i) => {
              const h = stats.dayTotals[dates[i]] || 0;
              const isActive = dayIndex === i;
              return (
                <button
                  key={d}
                  onClick={() => setDayIndex(i)}
                  className={cn(
                    'min-w-[92px] rounded-lg border px-3 py-2 text-start transition-colors',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card hover:bg-accent'
                  )}
                >
                  <div className="text-xs font-semibold">
                    {t.daysShort[i]} {shortDate(parseLocalDate(dates[i]), t.locale)}
                  </div>
                  <div className={cn('text-[11px]', isActive ? 'opacity-80' : 'text-muted-foreground')}>
                    {h ? fmtH(h) : t.empty}
                  </div>
                </button>
              );
            })}
          </div>

          {/* toolbar */}
          {canManageShifts ? (
            <Card>
              <CardContent className="flex flex-wrap items-center gap-2 p-3">
                <span className="text-xs text-muted-foreground">{t.brush}</span>
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setBrush(r.id)}
                    style={{ background: r.color, color: textOn(r.color) }}
                    className={cn(
                      'rounded-md border-2 px-2.5 py-1.5 text-xs font-medium transition-transform',
                      brush === r.id ? 'border-foreground' : 'border-transparent'
                    )}
                  >
                    {r.name}
                  </button>
                ))}
                <button
                  onClick={() => setBrush(null)}
                  className={cn(
                    'flex items-center gap-1 rounded-md border-2 bg-muted px-2.5 py-1.5 text-xs text-muted-foreground',
                    brush === null ? 'border-foreground' : 'border-transparent'
                  )}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  {t.erase}
                </button>

                <span className="flex-1" />

                <Button variant="ghost" size="sm" className="gap-1.5" onClick={copyPreviousDay}>
                  <Copy className="h-4 w-4" />
                  <span className="hidden md:inline">{t.copyYesterday}</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={duplicatePrevWeek}>
                  <CopyPlus className="h-4 w-4" />
                  <span className="hidden md:inline">{t.dupPrevWeek}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => actions.clearDay(currentDate)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden md:inline">{t.clearDay}</span>
                </Button>
                <Button
                  variant={editingSlots ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setEditingSlots((v) => !v)}
                >
                  <Sliders className="h-4 w-4" />
                  <span className="hidden md:inline">{editingSlots ? t.doneEditing : t.editStructure}</span>
                </Button>
                <Button
                  variant={managingRoles ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setManagingRoles((v) => !v)}
                >
                  <Palette className="h-4 w-4" />
                  <span className="hidden md:inline">{t.manageRoles}</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground">{t.readOnly}</p>
          )}

          {editingSlots && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">{t.editHint}</div>
          )}

          {managingRoles && (
            <RoleManager
              t={t}
              roles={roles}
              onAdd={(name, color) => saveRole.mutate({ name, color, sort_order: roles.length + 1 })}
              onRemove={(role) => deleteRole.mutate(role.id)}
            />
          )}

          {/* grid */}
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : !employees.length ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">{t.noEmployees}</CardContent>
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" onPointerMove={onPointerMove}>
                <thead>
                  <tr className="bg-muted/60">
                    <th
                      className={cn(
                        'sticky start-0 z-20 border border-border bg-muted px-2 py-1.5 text-start font-semibold',
                        editingSlots ? 'min-w-[196px]' : 'min-w-[112px]'
                      )}
                    >
                      {t.days[dayIndex]} {shortDate(parseLocalDate(currentDate), t.locale)}
                    </th>
                    {employees.map((e) => (
                      <th
                        key={e.id}
                        className="min-w-[72px] border border-border px-2 py-1.5 text-center font-semibold"
                      >
                        <button
                          type="button"
                          title={canManageShifts ? t.fillCol : undefined}
                          className={cn('w-full truncate', canManageShifts && 'cursor-pointer hover:text-primary')}
                          onClick={() =>
                            canManageShifts &&
                            !editingSlots &&
                            actions.fillColumn(
                              currentDate,
                              e.id,
                              slots.map((s) => s.id),
                              brush
                            )
                          }
                        >
                          {e.full_name.split(' ')[0]}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, si) => (
                    <tr key={slot.id}>
                      <td className="sticky start-0 z-10 whitespace-nowrap border border-border bg-card px-2 py-1 text-end text-[11px]">
                        {editingSlots ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="time"
                              value={slot.start_time}
                              onChange={(ev) =>
                                saveSlot.mutate({
                                  id: slot.id,
                                  start_time: ev.target.value,
                                  end_time: slot.end_time,
                                  sort_order: slot.sort_order,
                                })
                              }
                              className="h-7 w-[86px] px-1 text-[11px]"
                            />
                            <Input
                              type="time"
                              value={slot.end_time}
                              onChange={(ev) =>
                                saveSlot.mutate({
                                  id: slot.id,
                                  start_time: slot.start_time,
                                  end_time: ev.target.value,
                                  sort_order: slot.sort_order,
                                })
                              }
                              className="h-7 w-[86px] px-1 text-[11px]"
                            />
                            <button
                              title={t.insertSlot}
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                saveSlot.mutate({
                                  start_time: slot.end_time,
                                  end_time: addMinutesStr(slot.end_time, 60),
                                  sort_order: slot.sort_order + 1,
                                })
                              }
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              title={t.removeSlot}
                              className="text-destructive"
                              onClick={() => deleteSlot.mutate(slot.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          `${slot.start_time} – ${slot.end_time}`
                        )}
                      </td>
                      {employees.map((e) => {
                        const roleId = grid[currentDate]?.[e.id]?.[slot.id];
                        return (
                          <td
                            key={e.id}
                            data-emp={e.id}
                            data-slot={slot.id}
                            onPointerDown={(ev) => {
                              if (!canManageShifts || editingSlots) return;
                              ev.preventDefault();
                              dragging.current = true;
                              paint(e.id, slot.id);
                            }}
                            className={cn(
                              'select-none border border-border px-1 py-1.5 text-center text-[11px]',
                              canManageShifts && !editingSlots ? 'cursor-pointer' : 'cursor-default',
                              editingSlots && 'opacity-60'
                            )}
                            style={{ ...cellStyle(roleId), touchAction: 'none' }}
                          >
                            {roleId ? roleById.get(roleId)?.name : ''}
                          </td>
                        );
                      })}
                      {si === -1 && null}
                    </tr>
                  ))}
                  <tr>
                    <td className="sticky start-0 z-10 border border-border bg-muted/40 px-2 py-1.5 text-end text-[11px] font-bold">
                      {t.dayTotal}
                    </td>
                    {employees.map((e) => (
                      <td key={e.id} className="border border-border bg-muted/30 px-1 py-1.5 text-center font-bold">
                        {fmtH((stats.byEmpDay[currentDate] || {})[e.id] || 0)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sticky start-0 z-10 border border-border bg-muted/40 px-2 py-1.5 text-end text-[11px] font-bold">
                      {t.weekTotal}
                    </td>
                    {employees.map((e) => {
                      const cur = stats.byEmp[e.id] || 0;
                      const prev = prevStats.byEmp[e.id] || 0;
                      return (
                        <td key={e.id} className="border border-border bg-muted/50 px-1 py-1.5 text-center font-bold">
                          {fmtH(cur)}
                          {hasPrev && (
                            <div className="text-[10px] font-normal text-muted-foreground">
                              {fmtDelta(cur - prev)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </Card>
          )}

          {/* week summary */}
          <Card>
            <CardHeader className="flex-row flex-wrap items-baseline justify-between gap-2 pb-3">
              <CardTitle className="text-sm">{t.recap}</CardTitle>
              <span className="text-xs text-muted-foreground">
                {t.total} {fmtH(stats.total)} ·{' '}
                {hasPrev ? `${fmtDelta(stats.total - prevStats.total)} ${t.vsPrevWeek}` : t.noCompare}
              </span>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="min-w-[110px] border border-border px-2 py-1.5 text-start font-semibold">
                      {t.person}
                    </th>
                    {t.daysShort.map((d) => (
                      <th key={d} className="border border-border px-2 py-1.5 font-semibold">
                        {d}
                      </th>
                    ))}
                    <th className="border border-border px-2 py-1.5 font-semibold">{t.week}</th>
                    <th className="border border-border px-2 py-1.5 font-semibold">{t.lastWeek}</th>
                    <th className="border border-border px-2 py-1.5 font-semibold">{t.gap}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const cur = stats.byEmp[e.id] || 0;
                    const prev = prevStats.byEmp[e.id] || 0;
                    const diff = cur - prev;
                    return (
                      <tr key={e.id}>
                        <td className="border border-border px-2 py-1.5 text-start">
                          <button
                            type="button"
                            onClick={() => setSummaryEmp({ id: e.id, name: e.full_name })}
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            {e.full_name}
                          </button>
                        </td>

                        {dates.map((d) => (
                          <td key={d} className="border border-border px-2 py-1.5 text-center">
                            {(stats.byEmpDay[d] || {})[e.id] ? fmtH(stats.byEmpDay[d][e.id]) : '—'}
                          </td>
                        ))}
                        <td className="border border-border px-2 py-1.5 text-center font-bold">{fmtH(cur)}</td>
                        <td className="border border-border px-2 py-1.5 text-center text-muted-foreground">
                          {hasPrev ? fmtH(prev) : '—'}
                        </td>
                        <td
                          className={cn(
                            'border border-border px-2 py-1.5 text-center',
                            diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'
                          )}
                        >
                          {hasPrev ? fmtDelta(diff) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* staffing needs + note */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t.needs}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {roles
                  .filter((r) => !r.is_off)
                  .map((r) => (
                    <div key={r.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                        <span className="truncate">{r.name}</span>
                      </div>
                      <div className="text-xl font-bold">{fmtH(stats.byRole[r.id] || 0)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {t.upTo(stats.peak[r.id] || 0)}
                        {hasPrev
                          ? ` · ${fmtDelta((stats.byRole[r.id] || 0) - (prevStats.byRole[r.id] || 0))}`
                          : ''}
                      </div>
                    </div>
                  ))}
              </div>
              <Textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => {
                  if (noteDraft !== noteForWeek) saveNote.mutate({ weekStart, note: noteDraft });
                }}
                disabled={!canManageShifts}
                placeholder={t.notePlaceholder}
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>
        </>
      )}

      {summaryEmp && (
        <EmployeeWeekShiftsDialog
          open={!!summaryEmp}
          onOpenChange={(o) => !o && setSummaryEmp(null)}
          employeeName={summaryEmp.name}
          weekDays={dates.map((d) => parseLocalDate(d))}
          getEmployeeShifts={(date) => {
            const dayGrid = grid[date] || {};
            return blocksFor(dayGrid, summaryEmp.id, roles, slots).map((b, i) => ({
              id: `${date}-${i}`,
              start_time: b.start,
              end_time: b.end,
            }));
          }}
          isWfh={(date) => wfhDates?.get(summaryEmp.id)?.has(date) ?? false}
          departmentName={employees.find((e) => e.id === summaryEmp.id)?.departments?.name}
        />
      )}
    </div>
  );
}

