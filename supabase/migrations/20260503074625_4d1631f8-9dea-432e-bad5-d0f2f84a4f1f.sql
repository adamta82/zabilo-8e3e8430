CREATE TABLE public.birthday_greetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  emoji text,
  birthday_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_birthday_greetings_recipient_date ON public.birthday_greetings(recipient_id, birthday_date);

ALTER TABLE public.birthday_greetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view greetings"
  ON public.birthday_greetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users post own greetings"
  ON public.birthday_greetings FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users delete own greetings"
  ON public.birthday_greetings FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid() OR is_admin(auth.uid()));