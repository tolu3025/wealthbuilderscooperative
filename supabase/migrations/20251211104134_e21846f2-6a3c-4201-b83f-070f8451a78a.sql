
-- Drop and recreate distribute_mlm_earnings with 3×10 Forced Matrix logic
CREATE OR REPLACE FUNCTION public.distribute_mlm_earnings(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  v_current_ancestor UUID;
  v_uplines_paid INTEGER := 0;
  v_max_uplines INTEGER := 9;
  v_spillover NUMERIC;
  v_has_downline BOOLEAN;
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  -- Check if already distributed
  IF EXISTS (
    SELECT 1 FROM public.project_support_contributions
    WHERE id = p_payment_id AND mlm_distributed = true
  ) THEN
    RETURN;
  END IF;
  
  -- Get the PSF payer
  SELECT member_id INTO v_member_id
  FROM public.project_support_contributions
  WHERE id = p_payment_id;
  
  -- Ensure payer is in MLM tree
  PERFORM public.ensure_member_in_mlm_tree(v_member_id);
  
  -- ============================================
  -- LEVEL 1: PSF Payer gets ₦30 (PSF Reward)
  -- ============================================
  INSERT INTO public.mlm_distributions (
    project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
  ) VALUES (p_payment_id, v_member_id, 30, 300, 10, false);
  
  -- ============================================
  -- LEVELS 2-10: Walk up tree, pay 9 eligible ancestors
  -- ============================================
  -- Get the payer's parent (first ancestor)
  SELECT parent_id INTO v_current_ancestor
  FROM public.mlm_tree
  WHERE member_id = v_member_id;
  
  -- Walk up the tree until we've paid 9 ancestors or run out of tree
  WHILE v_current_ancestor IS NOT NULL AND v_uplines_paid < v_max_uplines LOOP
    -- Check if this ancestor has at least 1 downline (earning activation rule)
    SELECT EXISTS (
      SELECT 1 FROM public.mlm_tree WHERE parent_id = v_current_ancestor
    ) INTO v_has_downline;
    
    IF v_has_downline THEN
      -- Pay this ancestor ₦30
      INSERT INTO public.mlm_distributions (
        project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
      ) VALUES (p_payment_id, v_current_ancestor, 30, 300, 10, false);
      
      v_uplines_paid := v_uplines_paid + 1;
    END IF;
    
    -- Move to the next ancestor (grandparent)
    SELECT parent_id INTO v_current_ancestor
    FROM public.mlm_tree
    WHERE member_id = v_current_ancestor;
  END LOOP;
  
  -- ============================================
  -- SPILLOVER: Unfilled slots go to admin
  -- ============================================
  v_spillover := (v_max_uplines - v_uplines_paid) * 30;
  
  IF v_spillover > 0 THEN
    INSERT INTO public.mlm_distributions (
      project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
    ) VALUES (p_payment_id, admin_root_id, v_spillover, 300, 10, true);
  END IF;
  
  -- Mark as distributed
  UPDATE public.project_support_contributions SET mlm_distributed = true WHERE id = p_payment_id;
  
  RAISE NOTICE 'MLM Distribution complete for payment %: Payer paid, % uplines paid, ₦% spillover to admin', 
    p_payment_id, v_uplines_paid, v_spillover;
END;
$function$;
