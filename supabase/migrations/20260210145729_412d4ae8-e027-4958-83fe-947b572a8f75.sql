
-- Allow employees to delete their own requests
CREATE POLICY "Users can delete their own requests"
ON public.requests FOR DELETE
USING (user_id = auth.uid());

-- Function to check if current user is the approver of a request's submitter
CREATE OR REPLACE FUNCTION public.is_approver_of(_approver_user_id uuid, _employee_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _employee_user_id
    AND approver_id = (SELECT id FROM public.profiles WHERE user_id = _approver_user_id LIMIT 1)
  )
$$;

-- Allow approvers to view all requests of their assigned employees
CREATE POLICY "Approvers can view requests of their employees"
ON public.requests FOR SELECT
USING (public.is_approver_of(auth.uid(), user_id));

-- Allow approvers to update requests of their assigned employees
CREATE POLICY "Approvers can update requests of their employees"
ON public.requests FOR UPDATE
USING (public.is_approver_of(auth.uid(), user_id))
WITH CHECK (public.is_approver_of(auth.uid(), user_id));
