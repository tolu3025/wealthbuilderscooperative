-- Update all existing referral commissions from ₦500 to ₦1,000
-- This fixes historical data to match the current commission rate

UPDATE public.commissions
SET amount = 1000
WHERE commission_type = 'referral' 
  AND amount = 500;

-- Update member_balances to reflect the corrected commission amounts
-- Recalculate total_commissions for affected members
UPDATE public.member_balances mb
SET total_commissions = (
  SELECT COALESCE(SUM(c.amount), 0)
  FROM public.commissions c
  WHERE c.member_id = mb.member_id
    AND c.status = 'approved'
),
updated_at = now()
WHERE EXISTS (
  SELECT 1 
  FROM public.commissions c
  WHERE c.member_id = mb.member_id
    AND c.commission_type = 'referral'
);