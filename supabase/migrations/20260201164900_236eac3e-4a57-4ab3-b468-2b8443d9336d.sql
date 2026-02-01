-- Step 1: Drop duplicate trigger (keep only one)
-- First, let's see what triggers exist and drop the duplicate
DROP TRIGGER IF EXISTS trigger_update_balance_on_withdrawal ON public.withdrawal_requests;

-- Step 2: Update the function to handle both 'completed' AND 'paid' statuses
CREATE OR REPLACE FUNCTION public.update_member_balance_on_withdrawal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Process when status changes to 'completed' OR 'paid' (both mean paid-out)
  IF (NEW.status IN ('completed', 'paid')) AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'paid')) THEN
    
    IF NEW.withdrawal_type = 'dividend' THEN
      UPDATE public.member_balances
      SET total_dividends = GREATEST(0, total_dividends - NEW.amount), updated_at = now()
      WHERE member_id = NEW.member_id;
      
    ELSIF NEW.withdrawal_type = 'bonus' THEN
      -- Recalculate total_commissions from source data (both 'completed' and 'paid' withdrawals count)
      UPDATE public.member_balances
      SET total_commissions = (
        SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE member_id = NEW.member_id AND status = 'approved'
      ) + (
        SELECT COALESCE(SUM(amount), 0) FROM mlm_distributions WHERE member_id = NEW.member_id AND is_company_share = false
      ) - (
        SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests WHERE member_id = NEW.member_id AND withdrawal_type = 'bonus' AND status IN ('completed', 'paid')
      ),
      updated_at = now()
      WHERE member_id = NEW.member_id;
      
    ELSIF NEW.withdrawal_type = 'capital' THEN
      UPDATE public.member_balances
      SET total_capital = GREATEST(0, total_capital - NEW.amount), updated_at = now()
      WHERE member_id = NEW.member_id;
      
    ELSE
      -- Default: deduct from savings
      DECLARE
        current_savings NUMERIC;
        remaining_amount NUMERIC;
      BEGIN
        SELECT total_savings INTO current_savings FROM public.member_balances WHERE member_id = NEW.member_id;
        remaining_amount := NEW.amount;
        
        IF current_savings >= remaining_amount THEN
          UPDATE public.member_balances
          SET total_savings = total_savings - remaining_amount, updated_at = now()
          WHERE member_id = NEW.member_id;
        ELSE
          remaining_amount := remaining_amount - current_savings;
          UPDATE public.member_balances
          SET total_savings = 0, total_capital = GREATEST(0, total_capital - remaining_amount), updated_at = now()
          WHERE member_id = NEW.member_id;
        END IF;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 3: Ensure only one trigger exists (recreate it cleanly)
DROP TRIGGER IF EXISTS update_balance_on_withdrawal ON public.withdrawal_requests;
CREATE TRIGGER update_balance_on_withdrawal
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_member_balance_on_withdrawal();

-- Step 4: Normalize historical 'paid' statuses to 'completed'
-- This will trigger balance deductions for any that were missed
UPDATE public.withdrawal_requests
SET status = 'completed'
WHERE status = 'paid';

-- Step 5: Also update recalculate_member_commission_balances to handle both statuses
CREATE OR REPLACE FUNCTION public.recalculate_member_commission_balances()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  member_record RECORD;
  actual_commissions NUMERIC;
  actual_mlm NUMERIC;
  actual_withdrawals NUMERIC;
  correct_balance NUMERIC;
BEGIN
  FOR member_record IN SELECT DISTINCT member_id FROM member_balances
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO actual_commissions
    FROM commissions WHERE member_id = member_record.member_id AND status = 'approved';
    
    SELECT COALESCE(SUM(amount), 0) INTO actual_mlm
    FROM mlm_distributions WHERE member_id = member_record.member_id AND is_company_share = false;
    
    -- Count BOTH 'completed' and 'paid' withdrawals (actually paid out)
    SELECT COALESCE(SUM(amount), 0) INTO actual_withdrawals
    FROM withdrawal_requests 
    WHERE member_id = member_record.member_id 
      AND withdrawal_type = 'bonus' 
      AND status IN ('completed', 'paid');
    
    correct_balance := actual_commissions + actual_mlm - actual_withdrawals;
    
    UPDATE member_balances
    SET total_commissions = correct_balance, updated_at = now()
    WHERE member_id = member_record.member_id;
  END LOOP;
END;
$function$;