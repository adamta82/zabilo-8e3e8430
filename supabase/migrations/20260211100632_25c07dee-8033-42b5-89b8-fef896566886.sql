
-- Drop the old policy that shows all approved requests to everyone
DROP POLICY "Users can view own and approved requests" ON public.requests;

-- Create new policy: users see only their own requests
CREATE POLICY "Users can view their own requests"
ON public.requests
FOR SELECT
USING (user_id = auth.uid());
