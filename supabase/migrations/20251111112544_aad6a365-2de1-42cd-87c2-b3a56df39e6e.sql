-- Add dividend and commission tracking fields to member_balances
ALTER TABLE public.member_balances 
ADD COLUMN IF NOT EXISTS total_dividends NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_commissions NUMERIC NOT NULL DEFAULT 0;

-- Create trigger to update member balance when dividend is distributed
CREATE OR REPLACE FUNCTION public.update_member_balance_on_dividend()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process if status is 'calculated' (newly distributed)
  IF NEW.status = 'calculated' AND (OLD.status IS NULL OR OLD.status != 'calculated') THEN
    -- Update member balance with dividend amount
    INSERT INTO public.member_balances (member_id, total_dividends)
    VALUES (NEW.member_id, NEW.amount)
    ON CONFLICT (member_id) 
    DO UPDATE SET
      total_dividends = member_balances.total_dividends + NEW.amount,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_member_dividend_balance
AFTER INSERT OR UPDATE ON public.dividends
FOR EACH ROW
EXECUTE FUNCTION public.update_member_balance_on_dividend();

-- Create trigger to update member balance when commission is approved
CREATE OR REPLACE FUNCTION public.update_member_balance_on_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Update member balance with commission amount
    INSERT INTO public.member_balances (member_id, total_commissions)
    VALUES (NEW.member_id, NEW.amount)
    ON CONFLICT (member_id) 
    DO UPDATE SET
      total_commissions = member_balances.total_commissions + NEW.amount,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_member_commission_balance
AFTER INSERT OR UPDATE ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_member_balance_on_commission();

-- Update the withdrawal function to handle all withdrawal types correctly
CREATE OR REPLACE FUNCTION public.update_member_balance_on_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Deduct based on withdrawal type
    IF NEW.withdrawal_type = 'dividend' THEN
      -- Deduct from dividends
      UPDATE public.member_balances
      SET 
        total_dividends = GREATEST(0, total_dividends - NEW.amount),
        updated_at = now()
      WHERE member_id = NEW.member_id;
      
    ELSIF NEW.withdrawal_type = 'bonus' THEN
      -- Deduct from commissions (bonuses)
      UPDATE public.member_balances
      SET 
        total_commissions = GREATEST(0, total_commissions - NEW.amount),
        updated_at = now()
      WHERE member_id = NEW.member_id;
      
    ELSIF NEW.withdrawal_type = 'capital' THEN
      -- Deduct from capital only
      UPDATE public.member_balances
      SET 
        total_capital = GREATEST(0, total_capital - NEW.amount),
        updated_at = now()
      WHERE member_id = NEW.member_id;
      
    ELSE
      -- Default: deduct from savings first, then capital (original logic)
      DECLARE
        current_savings NUMERIC;
        remaining_amount NUMERIC;
      BEGIN
        SELECT total_savings 
        INTO current_savings
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
  END IF;
  
  RETURN NEW;
END;
$$;