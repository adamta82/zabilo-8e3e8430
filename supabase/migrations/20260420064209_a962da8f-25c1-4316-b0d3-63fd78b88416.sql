CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  method TEXT NOT NULL,
  url TEXT,
  query_params JSONB,
  body JSONB,
  headers JSONB,
  response_status INTEGER,
  response_body JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete webhook logs"
ON public.webhook_logs
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_function_name ON public.webhook_logs(function_name);