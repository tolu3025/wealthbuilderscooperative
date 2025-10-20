-- Drop and recreate the withdrawal balance update function with proper logic
DROP FUNCTION IF EXISTS public.update_member_balance_on_withdrawal() CASCADE;

CREATE OR REPLACE FUNCTION public.update_member_balance_on_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get current member balance
    DECLARE
      current_savings NUMERIC;
      current_capital NUMERIC;
      remaining_amount NUMERIC;
    BEGIN
      SELECT total_savings, total_capital 
      INTO current_savings, current_capital
      FROM public.member_balances
      WHERE member_id = NEW.member_id;

      remaining_amount := NEW.amount;

      -- First deduct from savings
      IF current_savings >= remaining_amount THEN
        -- Sufficient savings to cover full withdrawal
        UPDATE public.member_balances
        SET 
          total_savings = total_savings - remaining_amount,
          updated_at = now()
        WHERE member_id = NEW.member_id;
      ELSE
        -- Deduct all savings first, then from capital
        remaining_amount := remaining_amount - current_savings;
        
        UPDATE public.member_balances
        SET 
          total_savings = 0,
          total_capital = GREATEST(0, total_capital - remaining_amount),
          updated_at = now()
        WHERE member_id = NEW.member_id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_balance_on_withdrawal ON public.withdrawal_requests;
CREATE TRIGGER trigger_update_balance_on_withdrawal
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_member_balance_on_withdrawal();