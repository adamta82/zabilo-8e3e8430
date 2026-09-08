import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PlannerCell, PlannerRole, PlannerSlot } from '@/lib/shift-planner';

/* ---------------- roles ---------------- */

export function useShiftRoles() {
  return useQuery({
    queryKey: ['shift_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_roles')
        .select('id, name, color, sort_order, is_off')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PlannerRole[];
    },
  });
}

export function useSaveShiftRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (role: { id?: string; name: string; color: string; sort_order?: number }) => {
      if (role.id) {
        const { error } = await supabase
          .from('shift_roles')
          .update({ name: role.name, color: role.color })
          .eq('id', role.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shift_roles')
          .insert({ name: role.name, color: role.color, sort_order: role.sort_order ?? 50 });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift_roles'] }),
    onError: (e: Error) => toast({ title: 'שגיאה בשמירת התפקיד', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteShiftRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shift_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift_roles'] });
      qc.invalidateQueries({ queryKey: ['shift_cells'] });
    },
    onError: (e: Error) => toast({ title: 'שגיאה במחיקת התפקיד', description: e.message, variant: 'destructive' }),
  });
}

/* ---------------- slots ---------------- */

export function useShiftSlots() {
  return useQuery({
    queryKey: ['shift_slots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_slots')
        .select('id, start_time, end_time, sort_order')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PlannerSlot[];
    },
  });
}

export function useSaveShiftSlot() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (slot: { id?: string; start_time: string; end_time: string; sort_order: number }) => {
      if (slot.id) {
        const { error } = await supabase
          .from('shift_slots')
          .update({ start_time: slot.start_time, end_time: slot.end_time })
          .eq('id', slot.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shift_slots').insert({
          start_time: slot.start_time,
          end_time: slot.end_time,
          sort_order: slot.sort_order,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift_slots'] }),
    onError: (e: Error) => toast({ title: 'שגיאה בשמירת המשבצת', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteShiftSlot() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shift_slots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift_slots'] });
      qc.invalidateQueries({ queryKey: ['shift_cells'] });
    },
    onError: (e: Error) => toast({ title: 'שגיאה במחיקת המשבצת', description: e.message, variant: 'destructive' }),
  });
}

/* ---------------- cells ---------------- */

export function useShiftCells(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['shift_cells', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_cells')
        .select('date, employee_id, slot_id, role_id')
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      return (data || []) as PlannerCell[];
    },
  });
}

export function useAllShiftCells(enabled: boolean) {
  return useQuery({
    queryKey: ['shift_cells_all'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_cells')
        .select('date, employee_id, slot_id, role_id');
      if (error) throw error;
      return (data || []) as PlannerCell[];
    },
  });
}

type CellsKey = ['shift_cells', string, string];

export function useShiftCellActions(startDate: string, endDate: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key: CellsKey = ['shift_cells', startDate, endDate];

  const patch = (fn: (cells: PlannerCell[]) => PlannerCell[]) => {
    qc.setQueryData<PlannerCell[]>(key, (old) => fn(old || []));
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['shift_cells'] });
    qc.invalidateQueries({ queryKey: ['shift_cells_all'] });
  };

  const fail = (e: unknown) => {
    toast({
      title: 'שגיאה בשמירת הסידור',
      description: e instanceof Error ? e.message : undefined,
      variant: 'destructive',
    });
    refresh();
  };

  /** paint / erase a single cell */
  const setCell = async (date: string, employeeId: string, slotId: string, roleId: string | null) => {
    patch((cells) => {
      const rest = cells.filter(
        (c) => !(c.date === date && c.employee_id === employeeId && c.slot_id === slotId)
      );
      return roleId ? [...rest, { date, employee_id: employeeId, slot_id: slotId, role_id: roleId }] : rest;
    });
    try {
      if (roleId) {
        const { error } = await supabase
          .from('shift_cells')
          .upsert(
            { date, employee_id: employeeId, slot_id: slotId, role_id: roleId },
            { onConflict: 'date,employee_id,slot_id' }
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shift_cells')
          .delete()
          .eq('date', date)
          .eq('employee_id', employeeId)
          .eq('slot_id', slotId);
        if (error) throw error;
      }
    } catch (e) {
      fail(e);
    }
  };

  /** fill a whole employee column for one day (roleId null = clear) */
  const fillColumn = async (date: string, employeeId: string, slotIds: string[], roleId: string | null) => {
    patch((cells) => {
      const rest = cells.filter((c) => !(c.date === date && c.employee_id === employeeId));
      return roleId
        ? [...rest, ...slotIds.map((slot_id) => ({ date, employee_id: employeeId, slot_id, role_id: roleId }))]
        : rest;
    });
    try {
      const { error: delError } = await supabase
        .from('shift_cells')
        .delete()
        .eq('date', date)
        .eq('employee_id', employeeId);
      if (delError) throw delError;
      if (roleId && slotIds.length) {
        const { error } = await supabase
          .from('shift_cells')
          .insert(slotIds.map((slot_id) => ({ date, employee_id: employeeId, slot_id, role_id: roleId })));
        if (error) throw error;
      }
    } catch (e) {
      fail(e);
    }
  };

  const clearDay = async (date: string) => {
    patch((cells) => cells.filter((c) => c.date !== date));
    try {
      const { error } = await supabase.from('shift_cells').delete().eq('date', date);
      if (error) throw error;
    } catch (e) {
      fail(e);
    }
  };

  /** copy every cell from one date onto another */
  const copyDay = async (fromDate: string, toDate: string) => {
    const current = (qc.getQueryData<PlannerCell[]>(key) || []).filter((c) => c.date === fromDate);
    if (!current.length) return false;
    const copies = current.map((c) => ({ ...c, date: toDate }));
    patch((cells) => [...cells.filter((c) => c.date !== toDate), ...copies]);
    try {
      const { error: delError } = await supabase.from('shift_cells').delete().eq('date', toDate);
      if (delError) throw delError;
      const { error } = await supabase.from('shift_cells').insert(copies);
      if (error) throw error;
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  };

  /** duplicate the whole previous week into the current one */
  const duplicateWeek = async (prevDates: string[], dates: string[]) => {
    const { data, error: readError } = await supabase
      .from('shift_cells')
      .select('date, employee_id, slot_id, role_id')
      .gte('date', prevDates[0])
      .lte('date', prevDates[6]);
    if (readError) {
      fail(readError);
      return false;
    }
    if (!data || !data.length) return false;
    const map = new Map(prevDates.map((d, i) => [d, dates[i]]));
    const copies = (data as PlannerCell[])
      .filter((c) => map.has(c.date))
      .map((c) => ({ ...c, date: map.get(c.date) as string }));
    patch(() => copies);
    try {
      const { error: delError } = await supabase
        .from('shift_cells')
        .delete()
        .gte('date', dates[0])
        .lte('date', dates[6]);
      if (delError) throw delError;
      const { error } = await supabase.from('shift_cells').insert(copies);
      if (error) throw error;
      refresh();
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  };

  return { setCell, fillColumn, clearDay, copyDay, duplicateWeek };
}

/* ---------------- weekly notes ---------------- */

export function useShiftWeekNotes() {
  return useQuery({
    queryKey: ['shift_week_notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_week_notes')
        .select('week_start, note')
        .order('week_start');
      if (error) throw error;
      return (data || []) as { week_start: string; note: string }[];
    },
  });
}

export function useSaveShiftWeekNote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ weekStart, note }: { weekStart: string; note: string }) => {
      const { error } = await supabase
        .from('shift_week_notes')
        .upsert({ week_start: weekStart, note }, { onConflict: 'week_start' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift_week_notes'] }),
    onError: (e: Error) => toast({ title: 'שגיאה בשמירת ההערה', description: e.message, variant: 'destructive' }),
  });
}
