
-- Shifts: restrict to authenticated
DROP POLICY IF EXISTS "Everyone can view shifts" ON public.shifts;
CREATE POLICY "Everyone can view shifts"
ON public.shifts FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Shift managers can manage shifts" ON public.shifts;
CREATE POLICY "Shift managers can manage shifts"
ON public.shifts FOR ALL TO authenticated
USING (can_manage_shifts(auth.uid()))
WITH CHECK (can_manage_shifts(auth.uid()));

-- Requests: restrict public-role policies to authenticated
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.requests;
CREATE POLICY "Users can delete their own requests"
ON public.requests FOR DELETE TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
CREATE POLICY "Users can view their own requests"
ON public.requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Approvers can view requests of their employees" ON public.requests;
CREATE POLICY "Approvers can view requests of their employees"
ON public.requests FOR SELECT TO authenticated
USING (is_approver_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Approvers can update requests of their employees" ON public.requests;
CREATE POLICY "Approvers can update requests of their employees"
ON public.requests FOR UPDATE TO authenticated
USING (is_approver_of(auth.uid(), user_id))
WITH CHECK (is_approver_of(auth.uid(), user_id));

DROP POLICY IF EXISTS "Everyone can view approved leave and all supply requests" ON public.requests;
CREATE POLICY "Everyone can view approved leave and all supply requests"
ON public.requests FOR SELECT TO authenticated
USING (
  ((type = ANY (ARRAY['vacation'::request_type, 'wfh'::request_type])) AND (status = 'approved'::request_status))
  OR (type = ANY (ARRAY['equipment'::request_type, 'groceries'::request_type]))
);
