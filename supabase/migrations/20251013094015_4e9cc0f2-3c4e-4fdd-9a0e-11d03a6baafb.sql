-- Phase 1: Critical Fixes Database Schema (Fixed)

-- Create member_balances table
CREATE TABLE IF NOT EXISTS public.member_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_capital NUMERIC DEFAULT 0 NOT NULL,
  total_savings NUMERIC DEFAULT 0 NOT NULL,
  total_project_support NUMERIC DEFAULT 0 NOT NULL,
  months_contributed INTEGER DEFAULT 0 NOT NULL,
  eligible_for_dividend BOOLEAN DEFAULT false NOT NULL,
  eligible_for_withdrawal BOOLEAN DEFAULT false NOT NULL,
  last_contribution_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on member_balances
ALTER TABLE public.member_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for member_balances
CREATE POLICY "Members can view their own balance"
  ON public.member_balances FOR SELECT
  USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all balances"
  ON public.member_balances FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all balances"
  ON public.member_balances FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create financial_allocations table
CREATE TABLE IF NOT EXISTS public.financial_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registration_fees(id) ON DELETE CASCADE,
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('directors', 'chairman', 'coop_office', 'app_maintenance', 'corporator_office')),
  amount NUMERIC NOT NULL,
  settlement_month DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  settled_at TIMESTAMP WITH TIME ZONE,
  settled_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on financial_allocations
ALTER TABLE public.financial_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_allocations
CREATE POLICY "Admins can manage financial allocations"
  ON public.financial_allocations FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated can view allocations"
  ON public.financial_allocations FOR SELECT
  TO authenticated
  USING (true);

-- Create monthly_settlements table
CREATE TABLE IF NOT EXISTS public.monthly_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_month DATE NOT NULL UNIQUE,
  total_registrations INTEGER DEFAULT 0,
  total_contributions NUMERIC DEFAULT 0,
  total_allocated NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  broad_sheet_data JSONB,
  settled_by UUID REFERENCES auth.users(id),
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on monthly_settlements
ALTER TABLE public.monthly_settlements ENABLE ROW LEVEL SECURITY;

-- RLS policies for monthly_settlements
CREATE POLICY "Admins can manage settlements"
  ON public.monthly_settlements FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view settlements"
  ON public.monthly_settlements FOR SELECT
  TO authenticated
  USING (true);

-- Create director_assignments table
CREATE TABLE IF NOT EXISTS public.director_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  director_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state TEXT,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on director_assignments
ALTER TABLE public.director_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for director_assignments
CREATE POLICY "Admins can manage director assignments"
  ON public.director_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated can view director assignments"
  ON public.director_assignments FOR SELECT
  TO authenticated
  USING (true);

-- Create dismissed_announcements table
CREATE TABLE IF NOT EXISTS public.dismissed_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, blog_post_id)
);

-- Enable RLS on dismissed_announcements
ALTER TABLE public.dismissed_announcements ENABLE ROW LEVEL SECURITY;

-- RLS policies for dismissed_announcements
CREATE POLICY "Users can manage their own dismissals"
  ON public.dismissed_announcements FOR ALL
  USING (user_id = auth.uid());

-- Add show_as_banner column to blog_posts
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS show_as_banner BOOLEAN DEFAULT false;

-- Add settlement fields to registration_fees
ALTER TABLE public.registration_fees ADD COLUMN IF NOT EXISTS settlement_month DATE;
ALTER TABLE public.registration_fees ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'settled'));

-- Add settlement fields to contributions
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS settlement_month DATE;
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'settled'));

-- Function to update member balances when contribution is approved
CREATE OR REPLACE FUNCTION public.update_member_balance_on_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      SELECT COUNT(DISTINCT DATE_TRUNC('month', COALESCE(contribution_month, created_at))) >= 6
        AND SUM(capital_amount) >= 50000
      FROM public.contributions
      WHERE member_id = NEW.member_id
        AND payment_status = 'approved'
    ),
    eligible_for_withdrawal = (
      SELECT COUNT(DISTINCT DATE_TRUNC('month', COALESCE(contribution_month, created_at))) >= 6
      FROM public.contributions
      WHERE member_id = NEW.member_id
        AND payment_status = 'approved'
    )
    WHERE member_id = NEW.member_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for contribution approval
DROP TRIGGER IF EXISTS trigger_update_member_balance ON public.contributions;
CREATE TRIGGER trigger_update_member_balance
  AFTER INSERT OR UPDATE ON public.contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_member_balance_on_contribution();

-- Function to update member balance on withdrawal approval
CREATE OR REPLACE FUNCTION public.update_member_balance_on_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Deduct from savings balance
    UPDATE public.member_balances
    SET 
      total_savings = GREATEST(0, total_savings - NEW.amount),
      updated_at = now()
    WHERE member_id = NEW.member_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for withdrawal approval
DROP TRIGGER IF EXISTS trigger_update_balance_on_withdrawal ON public.withdrawal_requests;
CREATE TRIGGER trigger_update_balance_on_withdrawal
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_member_balance_on_withdrawal();

-- Function to create financial allocations when registration is approved
CREATE OR REPLACE FUNCTION public.create_financial_allocations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reg_month DATE;
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    reg_month := DATE_TRUNC('month', NEW.payment_date);
    
    -- Create financial allocation records
    INSERT INTO public.financial_allocations (registration_id, allocation_type, amount, settlement_month)
    VALUES 
      (NEW.id, 'directors', 700, reg_month),
      (NEW.id, 'chairman', 150, reg_month),
      (NEW.id, 'coop_office', 1000, reg_month),
      (NEW.id, 'app_maintenance', 500, reg_month),
      (NEW.id, 'corporator_office', 1500, reg_month);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for registration approval
DROP TRIGGER IF EXISTS trigger_create_allocations ON public.registration_fees;
CREATE TRIGGER trigger_create_allocations
  AFTER UPDATE ON public.registration_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.create_financial_allocations();

-- Create trigger for updated_at on member_balances
CREATE TRIGGER update_member_balances_updated_at
  BEFORE UPDATE ON public.member_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to approve commissions when member activates
CREATE OR REPLACE FUNCTION public.approve_commissions_on_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process if status changed to 'active'
  IF NEW.registration_status = 'active' AND (OLD.registration_status IS NULL OR OLD.registration_status != 'active') THEN
    -- Approve all pending commissions for this member
    UPDATE public.commissions
    SET status = 'approved'
    WHERE invited_member_id = NEW.id
      AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for activation
DROP TRIGGER IF EXISTS trigger_approve_commissions ON public.profiles;
CREATE TRIGGER trigger_approve_commissions
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.approve_commissions_on_activation();