-- Create a function to ensure member is in MLM tree (auto-add if missing)
CREATE OR REPLACE FUNCTION public.ensure_member_in_mlm_tree(p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter_id UUID;
  company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Skip if company root
  IF p_member_id = company_id THEN
    RETURN;
  END IF;
  
  -- Check if already in tree
  IF EXISTS (SELECT 1 FROM public.mlm_tree WHERE member_id = p_member_id) THEN
    RETURN;
  END IF;
  
  -- Get inviter from profile
  SELECT invited_by INTO v_inviter_id
  FROM public.profiles
  WHERE id = p_member_id;
  
  -- Add to MLM tree
  PERFORM public.assign_to_mlm_tree(p_member_id, v_inviter_id);
END;
$function$;

-- Update distribute_mlm_earnings to auto-add missing members before distribution
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
  company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Check if already distributed
  IF EXISTS (
    SELECT 1
    FROM public.project_support_contributions
    WHERE id = p_payment_id
      AND mlm_distributed = true
  ) THEN
    RETURN;
  END IF;
  
  -- Get member, payment month, and created_at timestamp
  SELECT member_id, contribution_month, created_at
  INTO v_member_id, v_payment_month, v_payment_created_at
  FROM public.project_support_contributions
  WHERE id = p_payment_id;
  
  -- ENSURE the payer is in the MLM tree (auto-add if missing)
  PERFORM public.ensure_member_in_mlm_tree(v_member_id);
  
  -- Company base share (always gets ₦30)
  INSERT INTO public.mlm_distributions (
    project_support_payment_id,
    member_id,
    amount,
    distribution_pool,
    participants_count,
    is_company_share
  ) VALUES (
    p_payment_id,
    company_id,
    v_per_person_amount,
    v_distribution_amount,
    10,
    true
  );
  
  -- Distribute to ACTIVE eligible members who have paid BEFORE this payment in the same month
  FOR v_participant IN
    SELECT DISTINCT ON (mt.member_id) mt.member_id
    FROM public.mlm_tree mt
    INNER JOIN public.profiles p ON mt.member_id = p.id
    WHERE mt.member_id != company_id
      AND mt.member_id != v_member_id  -- Exclude the payer
      AND p.registration_status = 'active'
      AND p.id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.project_support_contributions psc
        WHERE psc.member_id = mt.member_id
          AND psc.payment_status = 'approved'
          AND DATE_TRUNC('month', psc.contribution_month) = DATE_TRUNC('month', v_payment_month)
          AND psc.created_at < v_payment_created_at  -- Only members who paid BEFORE this payment
      )
    ORDER BY mt.member_id, mt.level ASC, mt.created_at ASC
    LIMIT 9
  LOOP
    INSERT INTO public.mlm_distributions (
      project_support_payment_id,
      member_id,
      amount,
      distribution_pool,
      participants_count,
      is_company_share
    ) VALUES (
      p_payment_id,
      v_participant.member_id,
      v_per_person_amount,
      v_distribution_amount,
      10,
      false
    );
    
    v_distributed_count := v_distributed_count + 1;
  END LOOP;
  
  -- Calculate spillover: unfilled member slots go to company
  IF v_distributed_count < v_max_member_slots THEN
    v_spillover_amount := (v_max_member_slots - v_distributed_count) * v_per_person_amount;
    
    INSERT INTO public.mlm_distributions (
      project_support_payment_id,
      member_id,
      amount,
      distribution_pool,
      participants_count,
      is_company_share
    ) VALUES (
      p_payment_id,
      company_id,
      v_spillover_amount,
      v_distribution_amount,
      10,
      true
    );
  END IF;
  
  -- Mark as distributed
  UPDATE public.project_support_contributions
  SET mlm_distributed = true
  WHERE id = p_payment_id;
END;
$function$;

-- Create a function to sync all active members to MLM tree (for maintenance/cleanup)
CREATE OR REPLACE FUNCTION public.sync_all_members_to_mlm_tree()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  member_record RECORD;
BEGIN
  -- Loop through all active members not in MLM tree
  FOR member_record IN
    SELECT p.id, p.invited_by
    FROM public.profiles p
    WHERE p.id != '00000000-0000-0000-0000-000000000001'
      AND p.registration_status = 'active'
      AND NOT EXISTS (SELECT 1 FROM public.mlm_tree WHERE member_id = p.id)
    ORDER BY p.created_at ASC
  LOOP
    PERFORM public.assign_to_mlm_tree(member_record.id, member_record.invited_by);
    RAISE NOTICE 'Added member % to MLM tree', member_record.id;
  END LOOP;
END;
$function$;