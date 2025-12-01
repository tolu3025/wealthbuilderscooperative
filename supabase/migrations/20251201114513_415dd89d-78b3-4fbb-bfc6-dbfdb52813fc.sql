-- Function to recalculate member commission balances from actual data
CREATE OR REPLACE FUNCTION recalculate_member_commission_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member_record RECORD;
  actual_commissions NUMERIC;
  actual_mlm NUMERIC;
  actual_withdrawals NUMERIC;
  correct_balance NUMERIC;
BEGIN
  -- Loop through all members with balances
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
    
    RAISE NOTICE 'Updated member %: commissions=%, mlm=%, withdrawals=%, final=%', 
      member_record.member_id, actual_commissions, actual_mlm, actual_withdrawals, correct_balance;
  END LOOP;
END;
$$;

-- Execute the recalculation immediately to fix all existing balances
SELECT recalculate_member_commission_balances();

-- Add a comment explaining the function
COMMENT ON FUNCTION recalculate_member_commission_balances() IS 
'Recalculates all member commission balances by summing actual approved commissions and MLM distributions, then subtracting approved bonus withdrawals. Run this if balances appear incorrect.';