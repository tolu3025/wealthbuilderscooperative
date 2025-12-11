
-- Clear existing MLM distributions and re-run with new 3×10 system
DO $$
DECLARE
  psf_record RECORD;
BEGIN
  -- First, delete all existing mlm_distributions to start fresh
  DELETE FROM public.mlm_distributions;
  
  -- Reset all PSF payments to not distributed
  UPDATE public.project_support_contributions 
  SET mlm_distributed = false 
  WHERE payment_status = 'approved';
  
  -- Re-distribute for all approved PSF payments using the new function
  FOR psf_record IN 
    SELECT id, member_id, created_at 
    FROM public.project_support_contributions 
    WHERE payment_status = 'approved'
    ORDER BY created_at ASC
  LOOP
    -- Call the new distribute_mlm_earnings function for each payment
    PERFORM public.distribute_mlm_earnings(psf_record.id);
    RAISE NOTICE 'Redistributed MLM for payment % (member %)', psf_record.id, psf_record.member_id;
  END LOOP;
  
  RAISE NOTICE 'MLM redistribution complete!';
END $$;

-- Recalculate all member commission balances to reflect new distributions
SELECT public.recalculate_member_commission_balances();
