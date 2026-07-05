ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_approve_wfh boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_approve_vacation boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET auto_approve_wfh = true, auto_approve_vacation = true WHERE auto_approve_requests = true;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auto_approve_requests;