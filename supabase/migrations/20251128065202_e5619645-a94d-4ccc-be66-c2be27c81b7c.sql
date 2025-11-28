-- Clean up duplicate commissions and ensure correct balances

-- First, delete ALL commission duplicates (keep only one per invited_member_id per commission_type)
WITH ranked_commissions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY member_id, invited_member_id, commission_type 
      ORDER BY created_at ASC
    ) as rn
  FROM commissions
)
DELETE FROM commissions
WHERE id IN (
  SELECT id FROM ranked_commissions WHERE rn > 1
);

-- Update all referral and state_rep commissions to 'approved' status
-- (they should all be approved for active members)
UPDATE commissions
SET status = 'approved'
WHERE commission_type IN ('referral', 'state_rep')
  AND invited_member_id IN (
    SELECT id FROM profiles WHERE registration_status = 'active'
  );

-- Recalculate all member balances from scratch
-- This ensures balances match actual approved commissions + MLM earnings - withdrawals
DO $$
DECLARE
  member_record RECORD;
  total_comm NUMERIC;
  total_mlm NUMERIC;
  total_withdrawn NUMERIC;
  correct_balance NUMERIC;
BEGIN
  FOR member_record IN SELECT DISTINCT id FROM profiles
  LOOP
    -- Calculate total approved commissions
    SELECT COALESCE(SUM(amount), 0) INTO total_comm
    FROM commissions
    WHERE member_id = member_record.id AND status = 'approved';
    
    -- Calculate total MLM earnings (exclude company shares)
    SELECT COALESCE(SUM(amount), 0) INTO total_mlm
    FROM mlm_distributions
    WHERE member_id = member_record.id AND is_company_share = false;
    
    -- Calculate total withdrawn bonuses
    SELECT COALESCE(SUM(amount), 0) INTO total_withdrawn
    FROM withdrawal_requests
    WHERE member_id = member_record.id 
      AND withdrawal_type = 'bonus' 
      AND status = 'approved';
    
    correct_balance := total_comm + total_mlm - total_withdrawn;
    
    -- Update member balance
    INSERT INTO member_balances (member_id, total_commissions, updated_at)
    VALUES (member_record.id, correct_balance, now())
    ON CONFLICT (member_id)
    DO UPDATE SET
      total_commissions = correct_balance,
      updated_at = now();
  END LOOP;
END $$;