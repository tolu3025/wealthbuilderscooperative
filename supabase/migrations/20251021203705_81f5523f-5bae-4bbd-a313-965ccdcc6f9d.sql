-- Fix dividend status check constraint
-- First, drop the existing constraint if it exists
ALTER TABLE public.dividends 
DROP CONSTRAINT IF EXISTS dividends_status_check;

-- Add updated constraint with all valid statuses
ALTER TABLE public.dividends 
ADD CONSTRAINT dividends_status_check 
CHECK (status IN ('pending', 'calculated', 'distributed', 'paid'));

-- Ensure any existing dividends have valid status
UPDATE public.dividends 
SET status = 'calculated' 
WHERE status NOT IN ('pending', 'calculated', 'distributed', 'paid');