-- Fix: Add UPDATE policy for admins on commissions table
CREATE POLICY "Admins can update commissions"
ON public.commissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create property plans table
CREATE TABLE public.property_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('joint_ownership', 'individual_ownership', 'property_business', 'reseller')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plan enrollments table
CREATE TABLE public.plan_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.property_plans(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(member_id, plan_id)
);

-- Enable RLS
ALTER TABLE public.property_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_plans
CREATE POLICY "Anyone can view property plans"
ON public.property_plans
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage property plans"
ON public.property_plans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for plan_enrollments
CREATE POLICY "Members can view their own enrollments"
ON public.plan_enrollments
FOR SELECT
USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Members can create their own enrollments"
ON public.plan_enrollments
FOR INSERT
WITH CHECK (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all enrollments"
ON public.plan_enrollments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all enrollments"
ON public.plan_enrollments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default plans
INSERT INTO public.property_plans (name, description, plan_type) VALUES
('Joint Property Ownership Plan', 'Co-own properties with other members through pooled contributions.', 'joint_ownership'),
('Individual Property Ownership Plan', 'Buy properties individually through the cooperative at discounted rates.', 'individual_ownership'),
('Personal Property Business Plan', 'Invest in property-related businesses or ventures managed by the cooperative.', 'property_business'),
('Property Reseller Plan', 'Register as cooperative property resellers to earn commissions on property sales.', 'reseller');

-- Update member balance trigger to use 3 months instead of 6
CREATE OR REPLACE FUNCTION public.update_member_balance_on_contribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contrib_month DATE;
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.payment_status = 'approved' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'approved') THEN
    -- Get or create member balance record
    INSERT INTO public.member_balances (member_id)
    VALUES (NEW.member_id)
    ON CONFLICT (member_id) DO NOTHING;
    
    -- Extract month from contribution
    contrib_month := DATE_TRUNC('month', COALESCE(NEW.contribution_month, NEW.created_at));
    
    -- Update member balance
    UPDATE public.member_balances
    SET 
      total_capital = total_capital + NEW.capital_amount,
      total_savings = total_savings + NEW.savings_amount,
      total_project_support = total_project_support + NEW.project_support_amount,
      last_contribution_date = NEW.payment_date,
      updated_at = now()
    WHERE member_id = NEW.member_id;
    
    -- Update months contributed (count distinct months)
    UPDATE public.member_balances
    SET months_contributed = (
      SELECT COUNT(DISTINCT DATE_TRUNC('month', COALESCE(contribution_month, created_at)))
      FROM public.contributions
      WHERE member_id = NEW.member_id
        AND payment_status = 'approved'
    ),
    eligible_for_dividend = (
      SELECT COUNT(DISTINCT DATE_TRUNC('month', COALESCE(contribution_month, created_at))) >= 3
        AND SUM(capital_amount) >= 50000
      FROM public.contributions
      WHERE member_id = NEW.member_id
        AND payment_status = 'approved'
    ),
    eligible_for_withdrawal = (
      SELECT COUNT(DISTINCT DATE_TRUNC('month', COALESCE(contribution_month, created_at))) >= 3
      FROM public.contributions
      WHERE member_id = NEW.member_id
        AND payment_status = 'approved'
    )
    WHERE member_id = NEW.member_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update dividend eligibility check function to use 3 months
CREATE OR REPLACE FUNCTION public.check_dividend_eligibility(p_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  months_contributed INTEGER;
  total_capital NUMERIC;
BEGIN
  -- Count months of contribution
  SELECT COUNT(DISTINCT contribution_month)
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
$function$;

-- Add updated_at trigger for property_plans
CREATE TRIGGER update_property_plans_updated_at
BEFORE UPDATE ON public.property_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();