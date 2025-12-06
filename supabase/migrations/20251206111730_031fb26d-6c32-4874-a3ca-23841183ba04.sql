
-- Update distribute_mlm_earnings to implement 3-way split:
-- Payer: ₦30, Parent: ₦30, Admin spillover: ₦240
CREATE OR REPLACE FUNCTION public.distribute_mlm_earnings(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  v_parent_id UUID;
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
  v_spillover NUMERIC := 240;
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
  
  -- Ensure payer is in MLM tree
  PERFORM public.ensure_member_in_mlm_tree(v_member_id);
  
  -- Get payer's parent from MLM tree
  SELECT parent_id INTO v_parent_id
  FROM public.mlm_tree
  WHERE member_id = v_member_id;
  
  -- 1. Payer gets ₦30
  INSERT INTO public.mlm_distributions (
    project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
  ) VALUES (p_payment_id, v_member_id, 30, 300, 10, false);
  
  -- 2. Parent gets ₦30 (if parent exists and is not the payer themselves)
  IF v_parent_id IS NOT NULL AND v_parent_id != v_member_id THEN
    -- Parent gets ₦30
    INSERT INTO public.mlm_distributions (
      project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
    ) VALUES (p_payment_id, v_parent_id, 30, 300, 10, false);
    
    -- Spillover remains ₦240
    v_spillover := 240;
  ELSE
    -- No parent or parent is self - all ₦270 goes to admin
    v_spillover := 270;
  END IF;
  
  -- 3. Admin gets spillover (₦240 or ₦270 if no parent)
  INSERT INTO public.mlm_distributions (
    project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
  ) VALUES (p_payment_id, admin_root_id, v_spillover, 300, 10, true);
  
  -- Mark as distributed
  UPDATE public.project_support_contributions SET mlm_distributed = true WHERE id = p_payment_id;
END;
$function$;

-- Recalculate all member balances to reflect any changes
SELECT public.recalculate_member_commission_balances();
