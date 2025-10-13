-- Drop the problematic check constraint on contributions.payment_status
ALTER TABLE public.contributions 
DROP CONSTRAINT IF EXISTS contributions_payment_status_check;

-- Add a new check constraint that allows 'pending' and 'approved' values
ALTER TABLE public.contributions 
ADD CONSTRAINT contributions_payment_status_check 
CHECK (payment_status IN ('pending', 'approved'));