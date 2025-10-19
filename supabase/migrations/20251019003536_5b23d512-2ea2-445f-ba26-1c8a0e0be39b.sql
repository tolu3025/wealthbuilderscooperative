-- Add withdrawal tracking to monthly settlements
ALTER TABLE public.monthly_settlements 
ADD COLUMN IF NOT EXISTS total_withdrawals NUMERIC DEFAULT 0;

-- Create function to add withdrawal to settlement
CREATE OR REPLACE FUNCTION public.add_withdrawal_to_settlement(
  p_month TEXT,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update settlement record
  INSERT INTO public.monthly_settlements (
    settlement_month,
    total_withdrawals,
    status
  )
  VALUES (
    p_month::DATE,
    p_amount,
    'pending'
  )
  ON CONFLICT (settlement_month) 
  DO UPDATE SET
    total_withdrawals = monthly_settlements.total_withdrawals + p_amount;
END;
$$;

-- Add unique constraint on settlement_month if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'monthly_settlements_settlement_month_key'
  ) THEN
    ALTER TABLE public.monthly_settlements 
    ADD CONSTRAINT monthly_settlements_settlement_month_key UNIQUE (settlement_month);
  END IF;
END $$;