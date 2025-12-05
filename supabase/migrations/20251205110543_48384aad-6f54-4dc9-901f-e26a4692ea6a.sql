
-- Reset and redistribute MLM earnings with new logic (payers get ₦30 from own payment)

-- Step 1: Delete all existing MLM distributions
DELETE FROM public.mlm_distributions;

-- Step 2: Reset mlm_distributed flag on all PSF contributions
UPDATE public.project_support_contributions
SET mlm_distributed = false
WHERE payment_status = 'approved';

-- Step 3: Redistribute for each approved PSF payment in chronological order
DO $$
DECLARE
  psc_record RECORD;
BEGIN
  FOR psc_record IN
    SELECT id
    FROM public.project_support_contributions
    WHERE payment_status = 'approved'
    ORDER BY created_at ASC
  LOOP
    PERFORM public.distribute_mlm_earnings(psc_record.id);
  END LOOP;
END $$;

-- Step 4: Recalculate all member commission balances
SELECT public.recalculate_member_commission_balances();
