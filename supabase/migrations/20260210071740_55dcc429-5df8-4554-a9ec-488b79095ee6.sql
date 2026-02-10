
-- Drop existing SELECT policy for requests
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;

-- Create new policy: users see their own requests + all approved requests
CREATE POLICY "Users can view own and approved requests"
ON public.requests
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_admin(auth.uid()) 
  OR status = 'approved'
);
