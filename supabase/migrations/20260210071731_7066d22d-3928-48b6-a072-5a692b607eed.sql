
-- Add use_vacation_days column to requests table
ALTER TABLE public.requests ADD COLUMN use_vacation_days boolean DEFAULT false;

-- Add single_day column to requests table  
ALTER TABLE public.requests ADD COLUMN vacation_single_day boolean DEFAULT false;
