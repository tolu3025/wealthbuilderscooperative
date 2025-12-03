-- Fix MLM distribution to NOT directly update balances (prevents doubling)
-- Balance will be recalculated by the trigger instead

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
    -- Credit MLM earnings - just insert record, trigger will update balance
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
    
    -- NOTE: Removed direct balance update - trigger handles this now
  END LOOP;
  
  -- Mark as distributed
  UPDATE public.project_support_contributions
  SET mlm_distributed = true
  WHERE id = p_payment_id;
END;
$function$;

-- Create trigger function to recalculate commission balance when MLM distribution is inserted
CREATE OR REPLACE FUNCTION public.update_member_balance_on_mlm_distribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actual_commissions NUMERIC;
  actual_mlm NUMERIC;
  actual_withdrawals NUMERIC;
  correct_balance NUMERIC;
BEGIN
  -- Skip company shares
  IF NEW.is_company_share = true THEN
    RETURN NEW;
  END IF;
  
  -- Calculate actual approved commissions for this member
  SELECT COALESCE(SUM(amount), 0) INTO actual_commissions
  FROM commissions
  WHERE member_id = NEW.member_id
    AND status = 'approved';
  
  -- Calculate actual MLM earnings (exclude company shares)
  SELECT COALESCE(SUM(amount), 0) INTO actual_mlm
  FROM mlm_distributions
  WHERE member_id = NEW.member_id
    AND is_company_share = false;
  
  -- Calculate actual approved withdrawals of type 'bonus'
  SELECT COALESCE(SUM(amount), 0) INTO actual_withdrawals
  FROM withdrawal_requests
  WHERE member_id = NEW.member_id
    AND withdrawal_type = 'bonus'
    AND status = 'approved';
  
  -- Correct balance = commissions + MLM - withdrawals
  correct_balance := actual_commissions + actual_mlm - actual_withdrawals;
  
  -- Update or insert member balance with correct value
  INSERT INTO public.member_balances (member_id, total_commissions)
  VALUES (NEW.member_id, correct_balance)
  ON CONFLICT (member_id) 
  DO UPDATE SET
    total_commissions = correct_balance,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger on mlm_distributions table
DROP TRIGGER IF EXISTS trigger_update_balance_on_mlm ON public.mlm_distributions;
CREATE TRIGGER trigger_update_balance_on_mlm
  AFTER INSERT ON public.mlm_distributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_member_balance_on_mlm_distribution();

-- Recalculate ALL member balances to fix any current discrepancies
DO $$
DECLARE
  member_record RECORD;
  actual_commissions NUMERIC;
  actual_mlm NUMERIC;
  actual_withdrawals NUMERIC;
  correct_balance NUMERIC;
BEGIN
  FOR member_record IN 
    SELECT DISTINCT member_id FROM member_balances
  LOOP
    -- Calculate actual approved commissions
    SELECT COALESCE(SUM(amount), 0) INTO actual_commissions
    FROM commissions
    WHERE member_id = member_record.member_id
      AND status = 'approved';
    
    -- Calculate actual MLM earnings (exclude company shares)
    SELECT COALESCE(SUM(amount), 0) INTO actual_mlm
    FROM mlm_distributions
    WHERE member_id = member_record.member_id
      AND is_company_share = false;
    
    -- Calculate actual approved withdrawals of type 'bonus'
    SELECT COALESCE(SUM(amount), 0) INTO actual_withdrawals
    FROM withdrawal_requests
    WHERE member_id = member_record.member_id
      AND withdrawal_type = 'bonus'
      AND status = 'approved';
    
    -- Correct balance = commissions + MLM - withdrawals
    correct_balance := actual_commissions + actual_mlm - actual_withdrawals;
    
    -- Update member balance with correct value
    UPDATE member_balances
    SET total_commissions = correct_balance,
        updated_at = now()
    WHERE member_id = member_record.member_id;
  END LOOP;
END;
$$;