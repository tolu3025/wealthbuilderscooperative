-- Fix distribute_mlm_earnings to handle spillover - give unfilled slots to company
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
  v_max_member_slots INTEGER := 9;  -- 9 member slots + 1 company = 10 total
  v_participant RECORD;
  v_payment_month DATE;
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
  
  -- Get member and payment month
  SELECT member_id, contribution_month
  INTO v_member_id, v_payment_month
  FROM public.project_support_contributions
  WHERE id = p_payment_id;
  
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
  
  -- Distribute to eligible members who have paid for the current month
  FOR v_participant IN
    SELECT DISTINCT ON (mt.member_id) mt.member_id
    FROM public.mlm_tree mt
    INNER JOIN public.profiles p ON mt.member_id = p.id
    WHERE mt.member_id != company_id
      AND p.registration_status = 'active'
      AND EXISTS (
        SELECT 1
        FROM public.project_support_contributions psc
        WHERE psc.member_id = mt.member_id
          AND psc.payment_status = 'approved'
          AND DATE_TRUNC('month', psc.contribution_month) = DATE_TRUNC('month', v_payment_month)
      )
    ORDER BY mt.member_id, mt.level ASC, mt.created_at ASC
    LIMIT 9
  LOOP
    -- Credit MLM earnings to member
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
    
    -- Credit spillover to company
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

-- Recalculate spillover for existing distributions
DO $$
DECLARE
  v_payment RECORD;
  v_distributed_to_members INTEGER;
  v_spillover_amount NUMERIC;
  v_per_person_amount NUMERIC := 30;
  v_max_member_slots INTEGER := 9;
  company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- For each PSF payment that has been distributed
  FOR v_payment IN
    SELECT id 
    FROM public.project_support_contributions 
    WHERE mlm_distributed = true
  LOOP
    -- Count how many members (non-company) received distributions for this payment
    SELECT COUNT(*) INTO v_distributed_to_members
    FROM public.mlm_distributions
    WHERE project_support_payment_id = v_payment.id
      AND is_company_share = false;
    
    -- Calculate spillover
    IF v_distributed_to_members < v_max_member_slots THEN
      v_spillover_amount := (v_max_member_slots - v_distributed_to_members) * v_per_person_amount;
      
      -- Check if spillover was already credited (company might have multiple records)
      -- Get total company amount for this payment
      DECLARE
        v_current_company_total NUMERIC;
        v_expected_company_total NUMERIC;
      BEGIN
        SELECT COALESCE(SUM(amount), 0) INTO v_current_company_total
        FROM public.mlm_distributions
        WHERE project_support_payment_id = v_payment.id
          AND is_company_share = true;
        
        -- Expected: base ₦30 + spillover
        v_expected_company_total := v_per_person_amount + v_spillover_amount;
        
        -- If company doesn't have the expected amount, add the difference
        IF v_current_company_total < v_expected_company_total THEN
          INSERT INTO public.mlm_distributions (
            project_support_payment_id,
            member_id,
            amount,
            distribution_pool,
            participants_count,
            is_company_share
          ) VALUES (
            v_payment.id,
            company_id,
            v_expected_company_total - v_current_company_total,
            300,
            10,
            true
          );
        END IF;
      END;
    END IF;
  END LOOP;
END $$;