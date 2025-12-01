
-- Delete duplicate referral commissions, keeping only the oldest record for each unique pair
DELETE FROM public.commissions
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY member_id, invited_member_id, commission_type 
        ORDER BY created_at ASC
      ) as rn
    FROM public.commissions
    WHERE commission_type IN ('referral', 'state_rep')
  ) t
  WHERE rn > 1
);

-- Recalculate all member commission balances from scratch
UPDATE public.member_balances
SET total_commissions = (
  SELECT COALESCE(SUM(c.amount), 0)
  FROM public.commissions c
  WHERE c.member_id = member_balances.member_id
    AND c.status = 'approved'
),
updated_at = now();

-- Also recalculate MLM distributions
UPDATE public.member_balances mb
SET total_commissions = (
  SELECT COALESCE(SUM(c.amount), 0) + COALESCE(SUM(m.amount), 0)
  FROM public.commissions c
  LEFT JOIN public.mlm_distributions m ON m.member_id = mb.member_id
  WHERE c.member_id = mb.member_id
    AND c.status = 'approved'
),
updated_at = now();
