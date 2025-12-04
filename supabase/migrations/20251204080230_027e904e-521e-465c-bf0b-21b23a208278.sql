-- Clear all existing MLM distributions
DELETE FROM public.mlm_distributions;

-- Reset mlm_distributed flag on all project support contributions
UPDATE public.project_support_contributions
SET mlm_distributed = false
WHERE payment_status = 'approved';

-- Re-distribute MLM earnings for all approved PSF contributions
DO $$
DECLARE
  psc_record RECORD;
BEGIN
  FOR psc_record IN 
    SELECT id FROM public.project_support_contributions 
    WHERE payment_status = 'approved'
    ORDER BY created_at ASC
  LOOP
    PERFORM public.distribute_mlm_earnings(psc_record.id);
  END LOOP;
END $$;

-- Recalculate all member commission balances
SELECT public.recalculate_member_commission_balances();