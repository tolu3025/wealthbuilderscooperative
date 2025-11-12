-- Update MLM distribution function to check for current month payment before distributing

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
  v_participant_count INTEGER := 10;
  v_participant RECORD;
  v_payment_month DATE;
  company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Check if already distributed
  IF EXISTS (SELECT 1 FROM public.project_support_contributions WHERE id = p_payment_id AND mlm_distributed = true) THEN
    RETURN;
  END IF;
  
  -- Get member and payment month
  SELECT member_id, contribution_month INTO v_member_id, v_payment_month
  FROM public.project_support_contributions
  WHERE id = p_payment_id;
  
  -- Company share (always gets ₦30)
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
    v_participant_count,
    true
  );
  
  -- Distribute to eligible members who have paid for the current month
  FOR v_participant IN
    SELECT DISTINCT mt.member_id
    FROM public.mlm_tree mt
    INNER JOIN public.profiles p ON mt.member_id = p.id
    WHERE mt.member_id != company_id
      AND p.registration_status = 'active'
      AND EXISTS (
        -- Must have paid project support for the current month
        SELECT 1 FROM public.project_support_contributions psc
        WHERE psc.member_id = mt.member_id
          AND psc.payment_status = 'approved'
          AND DATE_TRUNC('month', psc.contribution_month) = DATE_TRUNC('month', v_payment_month)
      )
    ORDER BY mt.level ASC, mt.created_at ASC
    LIMIT 9
  LOOP
    -- Credit MLM earnings
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
      v_participant_count,
      false
    );
    
    -- Update member balance
    UPDATE public.member_balances
    SET total_commissions = total_commissions + v_per_person_amount,
        updated_at = now()
    WHERE member_id = v_participant.member_id;
    
    -- Insert if balance record doesn't exist
    INSERT INTO public.member_balances (member_id, total_commissions)
    VALUES (v_participant.member_id, v_per_person_amount)
    ON CONFLICT (member_id) DO NOTHING;
  END LOOP;
  
  -- Mark as distributed
  UPDATE public.project_support_contributions
  SET mlm_distributed = true
  WHERE id = p_payment_id;
END;
$function$;