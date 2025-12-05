-- Add Coop Account 2 to MLM tree (they should be direct child of company root)
INSERT INTO public.mlm_tree (member_id, parent_id, level, position)
VALUES ('6c87866d-3b0f-45f1-ade2-ed61c06fb2f8', '00000000-0000-0000-0000-000000000001', 1, 1)
ON CONFLICT (member_id) DO NOTHING;

-- Clear and redistribute
DELETE FROM public.mlm_distributions;

UPDATE public.project_support_contributions
SET mlm_distributed = false
WHERE payment_status = 'approved';

-- Re-run distribution
DO $$
DECLARE
  payment_record RECORD;
BEGIN
  FOR payment_record IN
    SELECT id
    FROM public.project_support_contributions
    WHERE payment_status = 'approved'
    ORDER BY contribution_month ASC, created_at ASC
  LOOP
    PERFORM public.distribute_mlm_earnings(payment_record.id);
  END LOOP;
END $$;

-- Recalculate balances
SELECT public.recalculate_member_commission_balances();