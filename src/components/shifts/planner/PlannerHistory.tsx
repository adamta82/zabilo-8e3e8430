import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  computeStats,
  isoDate,
  addDaysTo,
  parseLocalDate,
  monthKeyOf,
  monthLabel,
  type PlannerCell,
  type PlannerRole,
  type PlannerSlot,
  type PlannerStrings,
  type PlannerGrid,
} from '@/lib/shift-planner';

interface Props {
  t: PlannerStrings;
  fmtH: (h: number) => string;
  fmtDelta: (d: number) => string;
  cells: PlannerCell[];
  roles: PlannerRole[];
  slots: PlannerSlot[];
  notes: { week_start: string; note: string }[];
  onOpenWeek: (weekStart: string) => void;
}

interface WeekSummary {
  weekStart: string;
  total: number;
  headcount: number;
  byRole: Record<string, number>;
  peak: Record<string, number>;
}

export function PlannerHistory({ t, fmtH, fmtDelta, cells, roles, slots, notes, onOpenWeek }: Props) {
  const weeks = useMemo<WeekSummary[]>(() => {
    const byWeek = new Map<string, PlannerCell[]>();
    cells.forEach((c) => {
      const d = parseLocalDate(c.date);
      const ws = isoDate(addDaysTo(d, -d.getDay()));
      const arr = byWeek.get(ws) || [];
      arr.push(c);
      byWeek.set(ws, arr);
    });

    return [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, weekCells]) => {
        const grid: PlannerGrid = {};
        const empIds = new Set<string>();
        weekCells.forEach((c) => {
          grid[c.date] = grid[c.date] || {};
          grid[c.date][c.employee_id] = grid[c.date][c.employee_id] || {};
          grid[c.date][c.employee_id][c.slot_id] = c.role_id;
          empIds.add(c.employee_id);
        });
        const dates = Array.from({ length: 7 }, (_, i) => isoDate(addDaysTo(parseLocalDate(weekStart), i)));
        const s = computeStats(grid, dates, [...empIds], roles, slots);
        return {
          weekStart,
          total: s.total,
          headcount: s.headcount,
          byRole: s.byRole,
          peak: s.peak,
        };
      });
  }, [cells, roles, slots]);

  const months = useMemo(() => {
    const m: Record<string, { total: number; weeks: number; byRole: Record<string, number>; peak: Record<string, number> }> = {};
    weeks.forEach((w) => {
      const k = monthKeyOf(w.weekStart);
      if (!m[k]) m[k] = { total: 0, weeks: 0, byRole: {}, peak: {} };
      m[k].total += w.total;
      m[k].weeks += 1;
      Object.entries(w.byRole).forEach(([r, h]) => (m[k].byRole[r] = (m[k].byRole[r] || 0) + h));
      Object.entries(w.peak).forEach(([r, c]) => (m[k].peak[r] = Math.max(m[k].peak[r] || 0, c)));
    });
    return m;
  }, [weeks]);

  const workRoles = roles.filter((r) => !r.is_off);
  const last = weeks.slice(-16);
  const max = Math.max(1, ...last.map((w) => w.total));
  const monthKeys = Object.keys(months).sort();
  const noteWeeks = notes.filter((n) => n.note?.trim()).slice(-12).reverse();

  if (!weeks.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">{t.noHistory}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-baseline justify-between gap-2 pb-3">
          <CardTitle className="text-sm">{t.hoursPerWeek}</CardTitle>
          <span className="text-xs text-muted-foreground">{t.weeksSaved(weeks.length)}</span>
        </CardHeader>
        <CardContent>
          <div className="flex h-44 items-end gap-2 overflow-x-auto pb-1">
            {last.map((w) => (
              <button
                key={w.weekStart}
                onClick={() => onOpenWeek(w.weekStart)}
                title={t.openWeek(parseLocalDate(w.weekStart).toLocaleDateString(t.locale))}
                className="flex min-w-[46px] flex-col items-center justify-end gap-1.5 rounded-md p-1 transition-colors hover:bg-muted"
              >
                <span className="text-[11px] font-medium">{Math.round(w.total)}</span>
                <span
                  className="w-6 rounded-sm bg-primary"
                  style={{ height: Math.max(4, Math.round((w.total / max) * 110)) }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {w.weekStart.slice(8)}/{w.weekStart.slice(5, 7)}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t.perMonth}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead>
              <tr className="bg-muted/60">
                <th className="border border-border px-2 py-2 text-start font-semibold">{t.month}</th>
                <th className="border border-border px-2 py-2 font-semibold">{t.weeks}</th>
                <th className="border border-border px-2 py-2 font-semibold">{t.total}</th>
                <th className="border border-border px-2 py-2 font-semibold">{t.gapPrevMonth}</th>
                {workRoles.map((r) => (
                  <th key={r.id} className="border border-border px-2 py-2 font-semibold">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthKeys.map((mk, i) => {
                const m = months[mk];
                const prev = i > 0 ? months[monthKeys[i - 1]] : null;
                return (
                  <tr key={mk}>
                    <td className="border border-border px-2 py-1.5 text-start">{monthLabel(mk, t.locale)}</td>
                    <td className="border border-border px-2 py-1.5 text-center">{m.weeks}</td>
                    <td className="border border-border px-2 py-1.5 text-center font-bold">{fmtH(m.total)}</td>
                    <td className="border border-border px-2 py-1.5 text-center text-muted-foreground">
                      {prev ? fmtDelta(m.total - prev.total) : '—'}
                    </td>
                    {workRoles.map((r) => (
                      <td key={r.id} className="border border-border px-2 py-1.5 text-center">
                        {m.byRole[r.id] ? fmtH(m.byRole[r.id]) : '—'}
                        {m.peak[r.id] ? (
                          <div className="text-[10px] text-muted-foreground">
                            {t.peak} {m.peak[r.id]}
                          </div>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t.pastNotes}</CardTitle>
        </CardHeader>
        <CardContent className={cn('space-y-2', !noteWeeks.length && 'text-sm text-muted-foreground')}>
          {noteWeeks.length
            ? noteWeeks.map((n) => (
                <div key={n.week_start} className="rounded-lg border border-border p-3 text-sm">
                  <button
                    onClick={() => onOpenWeek(n.week_start)}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {t.weekOfShort(parseLocalDate(n.week_start).toLocaleDateString(t.locale))}
                  </button>
                  <p className="mt-1.5 whitespace-pre-wrap text-muted-foreground">{n.note}</p>
                </div>
              ))
            : t.noNotes}
        </CardContent>
      </Card>
    </div>
  );
}
