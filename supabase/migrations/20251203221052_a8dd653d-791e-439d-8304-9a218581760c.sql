-- Fix the commission balance trigger to recalculate instead of just adding
CREATE OR REPLACE FUNCTION public.update_member_balance_on_commission()
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
  END IF;
  
  RETURN NEW;
END;
$$;

-- Now recalculate all existing member balances to fix current data
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
    SELECT COALESCE(SUM(amount), 0) INTO actual_commissions
    FROM commissions
    WHERE member_id = member_record.member_id
      AND status = 'approved';
    
    SELECT COALESCE(SUM(amount), 0) INTO actual_mlm
    FROM mlm_distributions
    WHERE member_id = member_record.member_id
      AND is_company_share = false;
    
    SELECT COALESCE(SUM(amount), 0) INTO actual_withdrawals
    FROM withdrawal_requests
    WHERE member_id = member_record.member_id
      AND withdrawal_type = 'bonus'
      AND status = 'approved';
    
    correct_balance := actual_commissions + actual_mlm - actual_withdrawals;
    
    UPDATE member_balances
    SET total_commissions = correct_balance,
        updated_at = now()
    WHERE member_id = member_record.member_id;
  END LOOP;
END;
$$;