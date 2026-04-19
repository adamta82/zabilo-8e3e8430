-- Add can_manage_shifts permission to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_manage_shifts boolean NOT NULL DEFAULT false;

-- Helper function: check if a user can manage shifts (admin OR has the flag)
CREATE OR REPLACE FUNCTION public.can_manage_shifts(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = _user_id AND can_manage_shifts = true
    )
$$;

-- Update RLS on shifts: replace admin-only manage policy with shift-manager policy
DROP POLICY IF EXISTS "Admins can manage shifts" ON public.shifts;

CREATE POLICY "Shift managers can manage shifts"
ON public.shifts
FOR ALL
USING (public.can_manage_shifts(auth.uid()))
WITH CHECK (public.can_manage_shifts(auth.uid()));