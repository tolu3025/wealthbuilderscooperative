-- Add admin policies for dividends table to allow distribution
CREATE POLICY "Admins can insert dividends"
ON public.dividends
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dividends"
ON public.dividends
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dividends"
ON public.dividends
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update check_dividend_eligibility function to ensure it uses 3 months
CREATE OR REPLACE FUNCTION public.check_dividend_eligibility(p_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  months_contributed INTEGER;
  total_capital NUMERIC;
BEGIN
  -- Count months of contribution
  SELECT COUNT(DISTINCT DATE_TRUNC('month', COALESCE(contribution_month, created_at)))
  INTO months_contributed
  FROM public.contributions
  WHERE member_id = p_member_id
    AND payment_status = 'approved';
  
  -- Calculate total capital
  SELECT COALESCE(SUM(capital_amount), 0)
  INTO total_capital
  FROM public.contributions
  WHERE member_id = p_member_id
    AND payment_status = 'approved';
  
  -- Check eligibility: 3+ months and ≥₦50,000 capital
  RETURN (months_contributed >= 3 AND total_capital >= 50000);
END;
$$;