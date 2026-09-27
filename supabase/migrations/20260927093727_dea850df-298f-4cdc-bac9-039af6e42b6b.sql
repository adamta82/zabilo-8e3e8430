CREATE TABLE public.shift_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('available','unavailable')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_availability TO authenticated;
GRANT ALL ON public.shift_availability TO service_role;
ALTER TABLE public.shift_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or managers read" ON public.shift_availability FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_manage_shifts(auth.uid()));
CREATE POLICY "own insert" ON public.shift_availability FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update" ON public.shift_availability FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON public.shift_availability FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_shift_availability_updated_at BEFORE UPDATE ON public.shift_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();