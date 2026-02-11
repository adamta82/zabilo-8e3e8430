
-- Create shifts table for employee shift scheduling
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT NOT NULL, -- Format: "HH:MM"
  end_time TEXT NOT NULL,   -- Format: "HH:MM"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by date and employee
CREATE INDEX idx_shifts_date ON public.shifts(date);
CREATE INDEX idx_shifts_employee_date ON public.shifts(employee_id, date);

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage shifts
CREATE POLICY "Admins can manage shifts"
ON public.shifts
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Everyone can view shifts (for calendar display)
CREATE POLICY "Everyone can view shifts"
ON public.shifts
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
