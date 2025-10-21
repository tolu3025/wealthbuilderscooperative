-- Fix dividend status constraint and set default value

-- Drop existing constraint
ALTER TABLE public.dividends 
DROP CONSTRAINT IF EXISTS dividends_status_check;

-- Add updated constraint with all valid statuses including 'cancelled'
ALTER TABLE public.dividends 
ADD CONSTRAINT dividends_status_check 
CHECK (status IN ('pending', 'calculated', 'distributed', 'paid', 'cancelled'));

-- Set default status to 'calculated'
ALTER TABLE public.dividends 
ALTER COLUMN status SET DEFAULT 'calculated';

-- Update any existing dividends with invalid status
UPDATE public.dividends 
SET status = 'calculated' 
WHERE status NOT IN ('pending', 'calculated', 'distributed', 'paid', 'cancelled');