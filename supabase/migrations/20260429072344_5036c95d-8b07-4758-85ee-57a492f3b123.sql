-- Morning briefings table
CREATE TABLE public.morning_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  audio_path TEXT,
  raw_transcript TEXT,
  summary_sections JSONB,
  attendance JSONB,
  status TEXT NOT NULL DEFAULT 'processing',
  created_by UUID NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_morning_briefings_date ON public.morning_briefings(briefing_date DESC);
CREATE INDEX idx_morning_briefings_status ON public.morning_briefings(status);

ALTER TABLE public.morning_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view briefings"
  ON public.morning_briefings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Shift managers can create briefings"
  ON public.morning_briefings FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_shifts(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Shift managers can update briefings"
  ON public.morning_briefings FOR UPDATE
  TO authenticated
  USING (can_manage_shifts(auth.uid()))
  WITH CHECK (can_manage_shifts(auth.uid()));

CREATE POLICY "Admins can delete briefings"
  ON public.morning_briefings FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_morning_briefings_updated_at
  BEFORE UPDATE ON public.morning_briefings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('morning-briefings-audio', 'morning-briefings-audio', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can view briefing audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'morning-briefings-audio');

CREATE POLICY "Shift managers can upload briefing audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'morning-briefings-audio' AND can_manage_shifts(auth.uid()));

CREATE POLICY "Shift managers can update briefing audio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'morning-briefings-audio' AND can_manage_shifts(auth.uid()));

CREATE POLICY "Admins can delete briefing audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'morning-briefings-audio' AND is_admin(auth.uid()));