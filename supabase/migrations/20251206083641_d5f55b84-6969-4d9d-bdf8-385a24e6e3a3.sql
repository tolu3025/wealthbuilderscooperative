
-- Fix: Update trigger to check for BOTH 'approved' AND 'completed' withdrawal statuses
-- Also fix the recalculate function

CREATE OR REPLACE FUNCTION public.update_member_balance_on_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Process if status changed to 'approved' OR 'completed'
  IF (NEW.status = 'approved' OR NEW.status = 'completed') 
     AND (OLD.status IS NULL OR (OLD.status != 'approved' AND OLD.status != 'completed')) THEN
    
    IF NEW.withdrawal_type = 'dividend' THEN
      UPDATE public.member_balances
      SET total_dividends = GREATEST(0, total_dividends - NEW.amount), updated_at = now()
      WHERE member_id = NEW.member_id;
      
    ELSIF NEW.withdrawal_type = 'bonus' THEN
      -- Recalculate total_commissions from source data
      UPDATE public.member_balances
      SET total_commissions = (
        SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE member_id = NEW.member_id AND status = 'approved'
      ) + (
        SELECT COALESCE(SUM(amount), 0) FROM mlm_distributions WHERE member_id = NEW.member_id AND is_company_share = false
      ) - (
        SELECT COALESCE(SUM(amount), 0) FROM withdrawal_requests WHERE member_id = NEW.member_id AND withdrawal_type = 'bonus' AND (status = 'approved' OR status = 'completed')
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

-- Fix the recalculate function to include 'completed' status
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
    
    -- Include BOTH 'approved' AND 'completed' withdrawal statuses
    SELECT COALESCE(SUM(amount), 0) INTO actual_withdrawals
    FROM withdrawal_requests 
    WHERE member_id = member_record.member_id 
      AND withdrawal_type = 'bonus' 
      AND (status = 'approved' OR status = 'completed');
    
    correct_balance := actual_commissions + actual_mlm - actual_withdrawals;
    
    UPDATE member_balances
    SET total_commissions = correct_balance, updated_at = now()
    WHERE member_id = member_record.member_id;
  END LOOP;
END;
$function$;

-- Recalculate all balances now
SELECT public.recalculate_member_commission_balances();
