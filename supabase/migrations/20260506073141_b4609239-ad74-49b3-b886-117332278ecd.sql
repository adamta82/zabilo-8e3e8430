-- Enum for day mark types
CREATE TYPE public.day_mark_type AS ENUM ('vacation','sick','absent','reserve','other');

-- Day marks table
CREATE TABLE public.day_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  type public.day_mark_type NOT NULL,
  note TEXT,
  correction_request_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.day_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own day_marks" ON public.day_marks FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_approver_of(auth.uid(), user_id));

CREATE POLICY "Users insert own day_marks" ON public.day_marks FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "Users update own day_marks" ON public.day_marks FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own day_marks" ON public.day_marks FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins manage day_marks" ON public.day_marks FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER day_marks_updated_at BEFORE UPDATE ON public.day_marks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Month correction requests
CREATE TABLE public.month_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','completed')),
  message TEXT,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

ALTER TABLE public.month_correction_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own correction reqs" ON public.month_correction_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_approver_of(auth.uid(), user_id));

CREATE POLICY "Users update own correction reqs" ON public.month_correction_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage correction reqs" ON public.month_correction_requests FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER mcr_updated_at BEFORE UPDATE ON public.month_correction_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log for clock_events edits
CREATE TABLE public.clock_event_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL CHECK (action IN ('create','update','delete')),
  old_values JSONB,
  new_values JSONB,
  reason TEXT
);

ALTER TABLE public.clock_event_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own edit logs" ON public.clock_event_edits FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_approver_of(auth.uid(), user_id));

CREATE POLICY "Authenticated insert edit logs" ON public.clock_event_edits FOR INSERT TO authenticated
WITH CHECK (edited_by = auth.uid());

-- Extend clock_events
ALTER TABLE public.clock_events
  ADD COLUMN IF NOT EXISTS last_edited_by UUID,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_correction BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS correction_request_id UUID;

CREATE INDEX IF NOT EXISTS idx_clock_events_user_time ON public.clock_events(user_id, event_time);
CREATE INDEX IF NOT EXISTS idx_day_marks_user_date ON public.day_marks(user_id, date);
