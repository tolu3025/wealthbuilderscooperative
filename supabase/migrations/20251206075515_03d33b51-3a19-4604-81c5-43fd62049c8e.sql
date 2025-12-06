
-- STEP 1: Drop the triggers that add members to MLM tree at registration
-- MLM placement should ONLY happen when PSF is approved
DROP TRIGGER IF EXISTS after_profile_insert_mlm_tree ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_created_mlm_tree ON public.profiles;

-- STEP 2: The ensure_member_in_mlm_tree function is already called in distribute_mlm_earnings
-- when PSF is approved, so placement will now ONLY happen on PSF approval

-- STEP 3: Update the distribute_mlm_earnings function to be clearer about the flow
CREATE OR REPLACE FUNCTION public.distribute_mlm_earnings(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  v_distribution_amount NUMERIC := 300;
  v_per_person_amount NUMERIC := 30;
  v_max_member_slots INTEGER := 9;
  v_participant RECORD;
  v_payment_month DATE;
  v_payment_created_at TIMESTAMPTZ;
  v_distributed_count INTEGER := 0;
  v_spillover_amount NUMERIC;
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  -- Check if already distributed
  IF EXISTS (
    SELECT 1 FROM public.project_support_contributions
    WHERE id = p_payment_id AND mlm_distributed = true
  ) THEN
    RETURN;
  END IF;
  
  -- Get member, payment month, and created_at timestamp
  SELECT member_id, contribution_month, created_at
  INTO v_member_id, v_payment_month, v_payment_created_at
  FROM public.project_support_contributions
  WHERE id = p_payment_id;
  
  -- CRITICAL: Add the payer to MLM tree NOW (only happens when PSF is approved)
  -- This is where MLM placement occurs - NOT at registration
  PERFORM public.ensure_member_in_mlm_tree(v_member_id);
  
  -- Admin root always gets base share (₦30)
  INSERT INTO public.mlm_distributions (
    project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
  ) VALUES (p_payment_id, admin_root_id, v_per_person_amount, v_distribution_amount, 10, true);
  
  -- Credit the payer ₦30 immediately (no more, no less)
  INSERT INTO public.mlm_distributions (
    project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
  ) VALUES (p_payment_id, v_member_id, v_per_person_amount, v_distribution_amount, 10, false);
  
  v_distributed_count := 1; -- Payer took 1 slot
  
  -- Distribute to OTHER eligible members who have paid BEFORE this payment
  FOR v_participant IN
    SELECT DISTINCT ON (mt.member_id) mt.member_id
    FROM public.mlm_tree mt
    INNER JOIN public.profiles p ON mt.member_id = p.id
    WHERE mt.member_id != admin_root_id
      AND mt.member_id != v_member_id
      AND p.registration_status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.project_support_contributions psc
        WHERE psc.member_id = mt.member_id
          AND psc.payment_status = 'approved'
          AND DATE_TRUNC('month', psc.contribution_month) = DATE_TRUNC('month', v_payment_month)
          AND psc.created_at < v_payment_created_at
      )
    ORDER BY mt.member_id, mt.level ASC, mt.created_at ASC
    LIMIT 8
  LOOP
    INSERT INTO public.mlm_distributions (
      project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
    ) VALUES (p_payment_id, v_participant.member_id, v_per_person_amount, v_distribution_amount, 10, false);
    v_distributed_count := v_distributed_count + 1;
  END LOOP;
  
  -- All unfilled slots (spillover) go to Admin account
  IF v_distributed_count < v_max_member_slots THEN
    v_spillover_amount := (v_max_member_slots - v_distributed_count) * v_per_person_amount;
    INSERT INTO public.mlm_distributions (
      project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
    ) VALUES (p_payment_id, admin_root_id, v_spillover_amount, v_distribution_amount, 10, true);
  END IF;
  
  -- Mark as distributed
  UPDATE public.project_support_contributions SET mlm_distributed = true WHERE id = p_payment_id;
END;
$function$;

-- STEP 4: Clean up any members in MLM tree who haven't paid PSF
-- (they shouldn't be in the tree under the new rules)
-- First, reassign their children to admin, then remove them
UPDATE public.mlm_tree
SET parent_id = '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8'
WHERE parent_id IN (
  SELECT mt.member_id
  FROM public.mlm_tree mt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.project_support_contributions psc
    WHERE psc.member_id = mt.member_id
    AND psc.payment_status = 'approved'
  )
  AND mt.member_id != '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8'
);

-- Now delete members from MLM tree who haven't paid PSF (except admin root)
DELETE FROM public.mlm_tree
WHERE member_id IN (
  SELECT mt.member_id
  FROM public.mlm_tree mt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.project_support_contributions psc
    WHERE psc.member_id = mt.member_id
    AND psc.payment_status = 'approved'
  )
  AND mt.member_id != '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8'
);
