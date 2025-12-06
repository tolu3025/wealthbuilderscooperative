
-- Fix update_member_balance_on_commission to use 'completed' for withdrawals
CREATE OR REPLACE FUNCTION public.update_member_balance_on_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  actual_commissions NUMERIC;
  actual_mlm NUMERIC;
  actual_withdrawals NUMERIC;
  correct_balance NUMERIC;
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
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
    
    -- Calculate actual COMPLETED withdrawals of type 'bonus' (not approved!)
    SELECT COALESCE(SUM(amount), 0) INTO actual_withdrawals
    FROM withdrawal_requests
    WHERE member_id = NEW.member_id
      AND withdrawal_type = 'bonus'
      AND status = 'completed';
    
    -- Correct balance = commissions + MLM - completed withdrawals
    correct_balance := actual_commissions + actual_mlm - actual_withdrawals;
    
    -- Update or insert member balance with correct value
    INSERT INTO public.member_balances (member_id, total_commissions)
    VALUES (NEW.member_id, correct_balance)
    ON CONFLICT (member_id) 
    DO UPDATE SET
      total_commissions = correct_balance,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_member_balance_on_mlm_distribution to use 'completed' for withdrawals
CREATE OR REPLACE FUNCTION public.update_member_balance_on_mlm_distribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Calculate actual COMPLETED withdrawals of type 'bonus' (not approved!)
  SELECT COALESCE(SUM(amount), 0) INTO actual_withdrawals
  FROM withdrawal_requests
  WHERE member_id = NEW.member_id
    AND withdrawal_type = 'bonus'
    AND status = 'completed';
  
  -- Correct balance = commissions + MLM - completed withdrawals
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
$function$;

-- Recalculate ALL member balances with the corrected logic
SELECT public.recalculate_member_commission_balances();
