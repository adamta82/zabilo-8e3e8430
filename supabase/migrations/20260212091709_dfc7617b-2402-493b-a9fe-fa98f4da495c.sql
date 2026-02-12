
-- Allow all authenticated users to see approved vacation/wfh and all equipment/groceries requests
CREATE POLICY "Everyone can view approved leave and all supply requests"
ON public.requests
FOR SELECT
USING (
  (type IN ('vacation', 'wfh') AND status = 'approved')
  OR
  (type IN ('equipment', 'groceries'))
);
