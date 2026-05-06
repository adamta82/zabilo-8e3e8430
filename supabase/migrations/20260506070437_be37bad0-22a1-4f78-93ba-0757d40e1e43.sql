-- Enums
CREATE TYPE public.clock_event_type AS ENUM ('in', 'out');
CREATE TYPE public.clock_event_method AS ENUM ('qr', 'nfc', 'manual', 'wfh');

-- Locations
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  geofence_radius integer NOT NULL DEFAULT 300,
  qr_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  nfc_tag_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active locations"
ON public.locations FOR SELECT TO authenticated
USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage locations"
ON public.locations FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clock events
CREATE TABLE public.clock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type public.clock_event_type NOT NULL,
  method public.clock_event_method NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  gps_lat double precision,
  gps_lng double precision,
  gps_accuracy double precision,
  outside_geofence boolean NOT NULL DEFAULT false,
  notes text,
  is_approved boolean NOT NULL DEFAULT true,
  approved_by uuid,
  approved_at timestamptz,
  shift_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clock_events_user_time ON public.clock_events(user_id, event_time DESC);
CREATE INDEX idx_clock_events_time ON public.clock_events(event_time DESC);
ALTER TABLE public.clock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own events"
ON public.clock_events FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Approvers view events of their employees"
ON public.clock_events FOR SELECT TO authenticated
USING (public.is_approver_of(auth.uid(), user_id));

CREATE POLICY "Admins view all events"
ON public.clock_events FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users insert own events"
ON public.clock_events FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own pending events"
ON public.clock_events FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own events"
ON public.clock_events FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins manage all events"
ON public.clock_events FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Approvers update events of their employees"
ON public.clock_events FOR UPDATE TO authenticated
USING (public.is_approver_of(auth.uid(), user_id))
WITH CHECK (public.is_approver_of(auth.uid(), user_id));

CREATE TRIGGER trg_clock_events_updated_at
BEFORE UPDATE ON public.clock_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Attendance settings (single row, key/value)
CREATE TABLE public.attendance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_hours numeric NOT NULL DEFAULT 8,
  weekly_overtime_threshold numeric NOT NULL DEFAULT 42,
  overtime_multiplier numeric NOT NULL DEFAULT 1.25,
  manual_entry_max_days_back integer NOT NULL DEFAULT 7,
  allow_qr boolean NOT NULL DEFAULT true,
  allow_nfc boolean NOT NULL DEFAULT true,
  allow_manual boolean NOT NULL DEFAULT true,
  allow_wfh boolean NOT NULL DEFAULT true,
  require_gps_for_qr boolean NOT NULL DEFAULT false,
  qr_rotation_seconds integer NOT NULL DEFAULT 120,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view attendance settings"
ON public.attendance_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins manage attendance settings"
ON public.attendance_settings FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_attendance_settings_updated_at
BEFORE UPDATE ON public.attendance_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.attendance_settings DEFAULT VALUES;