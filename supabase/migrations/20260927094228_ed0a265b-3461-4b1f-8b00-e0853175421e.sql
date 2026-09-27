CREATE TABLE public.shift_day_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day date NOT NULL UNIQUE,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_day_notes TO authenticated;
GRANT ALL ON public.shift_day_notes TO service_role;
ALTER TABLE public.shift_day_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shift_day_notes_read" ON public.shift_day_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_day_notes_manage" ON public.shift_day_notes FOR ALL TO authenticated
  USING (public.can_manage_shifts(auth.uid())) WITH CHECK (public.can_manage_shifts(auth.uid()));
CREATE TRIGGER trg_shift_day_notes_updated_at BEFORE UPDATE ON public.shift_day_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Move existing per-day notes (rows whose week_start is not a Sunday) into the daily table
INSERT INTO public.shift_day_notes (day, note)
SELECT week_start, note FROM public.shift_week_notes
WHERE extract(dow from week_start) <> 0
ON CONFLICT (day) DO NOTHING;
DELETE FROM public.shift_week_notes WHERE extract(dow from week_start) <> 0;