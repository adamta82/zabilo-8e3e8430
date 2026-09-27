CREATE TABLE public.shift_day_locks (
  day date PRIMARY KEY,
  locked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_day_locks TO authenticated;
GRANT ALL ON public.shift_day_locks TO service_role;
ALTER TABLE public.shift_day_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view day locks" ON public.shift_day_locks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shift managers manage day locks" ON public.shift_day_locks FOR ALL TO authenticated
  USING (public.can_manage_shifts(auth.uid())) WITH CHECK (public.can_manage_shifts(auth.uid()));