
-- Recalculate all member commission balances to ensure accuracy
DO $$
DECLARE
  member_record RECORD;
  actual_commissions NUMERIC;
  actual_mlm NUMERIC;
  actual_withdrawals NUMERIC;
  correct_balance NUMERIC;
BEGIN
  FOR member_record IN 
    SELECT DISTINCT p.id as member_id
    FROM profiles p
    WHERE p.id != '00000000-0000-0000-0000-000000000001'
  LOOP
    -- Calculate actual approved commissions (referral only)
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
    
    -- Update or insert member balance with correct value
    INSERT INTO member_balances (member_id, total_commissions)
    VALUES (member_record.member_id, correct_balance)
    ON CONFLICT (member_id) 
    DO UPDATE SET
      total_commissions = correct_balance,
      updated_at = now();
    
    RAISE NOTICE 'Member %: commissions=%, mlm=%, withdrawals=%, final=%', 
      member_record.member_id, actual_commissions, actual_mlm, actual_withdrawals, correct_balance;
  END LOOP;
END $$;
