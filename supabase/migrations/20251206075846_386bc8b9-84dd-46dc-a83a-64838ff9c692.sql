
-- Simplified MLM: Payer gets ₦30 only, Admin gets ₦270 spillover
-- NO distribution to other members

CREATE OR REPLACE FUNCTION public.distribute_mlm_earnings(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  -- Check if already distributed
  IF EXISTS (
    SELECT 1 FROM public.project_support_contributions
    WHERE id = p_payment_id AND mlm_distributed = true
  ) THEN
    RETURN;
  END IF;
  
  -- Get the payer
  SELECT member_id INTO v_member_id
  FROM public.project_support_contributions
  WHERE id = p_payment_id;
  
  -- Add payer to MLM tree (placement happens on PSF approval)
  PERFORM public.ensure_member_in_mlm_tree(v_member_id);
  
  -- Payer gets ₦30 ONLY (no more, no less)
  INSERT INTO public.mlm_distributions (
    project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
  ) VALUES (p_payment_id, v_member_id, 30, 300, 10, false);
  
  -- Admin gets remaining ₦270 as spillover
  INSERT INTO public.mlm_distributions (
    project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
  ) VALUES (p_payment_id, admin_root_id, 270, 300, 10, true);
  
  -- Mark as distributed
  UPDATE public.project_support_contributions SET mlm_distributed = true WHERE id = p_payment_id;
END;
$function$;

-- Reset and redistribute with new logic
DELETE FROM public.mlm_distributions;

UPDATE public.project_support_contributions SET mlm_distributed = false WHERE payment_status = 'approved';

-- Redistribute for each approved PSF
DO $$
DECLARE
  psc_record RECORD;
BEGIN
  FOR psc_record IN
    SELECT id FROM public.project_support_contributions WHERE payment_status = 'approved' ORDER BY created_at ASC
  LOOP
    PERFORM public.distribute_mlm_earnings(psc_record.id);
  END LOOP;
END $$;

-- Recalculate all member balances
SELECT public.recalculate_member_commission_balances();
