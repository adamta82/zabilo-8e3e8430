-- Roles
CREATE TABLE public.shift_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#cfcfcf',
  sort_order integer NOT NULL DEFAULT 0,
  is_off boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_roles TO authenticated;
GRANT ALL ON public.shift_roles TO service_role;
ALTER TABLE public.shift_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift_roles_read" ON public.shift_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_roles_manage" ON public.shift_roles FOR ALL TO authenticated
  USING (public.can_manage_shifts(auth.uid())) WITH CHECK (public.can_manage_shifts(auth.uid()));
CREATE TRIGGER trg_shift_roles_updated_at BEFORE UPDATE ON public.shift_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Time slots
CREATE TABLE public.shift_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_time text NOT NULL,
  end_time text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_slots TO authenticated;
GRANT ALL ON public.shift_slots TO service_role;
ALTER TABLE public.shift_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift_slots_read" ON public.shift_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_slots_manage" ON public.shift_slots FOR ALL TO authenticated
  USING (public.can_manage_shifts(auth.uid())) WITH CHECK (public.can_manage_shifts(auth.uid()));
CREATE TRIGGER trg_shift_slots_updated_at BEFORE UPDATE ON public.shift_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grid cells
CREATE TABLE public.shift_cells (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.shift_slots(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.shift_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, employee_id, slot_id)
);
CREATE INDEX idx_shift_cells_date ON public.shift_cells (date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_cells TO authenticated;
GRANT ALL ON public.shift_cells TO service_role;
ALTER TABLE public.shift_cells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift_cells_read" ON public.shift_cells FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_cells_manage" ON public.shift_cells FOR ALL TO authenticated
  USING (public.can_manage_shifts(auth.uid())) WITH CHECK (public.can_manage_shifts(auth.uid()));
CREATE TRIGGER trg_shift_cells_updated_at BEFORE UPDATE ON public.shift_cells
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Weekly notes
CREATE TABLE public.shift_week_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start date NOT NULL UNIQUE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_week_notes TO authenticated;
GRANT ALL ON public.shift_week_notes TO service_role;
ALTER TABLE public.shift_week_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift_week_notes_read" ON public.shift_week_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_week_notes_manage" ON public.shift_week_notes FOR ALL TO authenticated
  USING (public.can_manage_shifts(auth.uid())) WITH CHECK (public.can_manage_shifts(auth.uid()));
CREATE TRIGGER trg_shift_week_notes_updated_at BEFORE UPDATE ON public.shift_week_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();