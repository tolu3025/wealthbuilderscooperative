-- Phase 2-5: Registration, Contribution, Dividend, and Commission System

-- =============================================
-- PHASE 2: REGISTRATION MODULE
-- =============================================

-- Create payment-receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment receipts
CREATE POLICY "Users can upload their own payment receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create registration_fees table to track ₦5,000 registration breakdown
CREATE TABLE public.registration_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 5000,
  directors_share NUMERIC NOT NULL DEFAULT 700,
  chairman_share NUMERIC NOT NULL DEFAULT 150,
  coop_office_share NUMERIC NOT NULL DEFAULT 1000,
  app_maintenance_share NUMERIC NOT NULL DEFAULT 500,
  corporator_office_share NUMERIC NOT NULL DEFAULT 1500,
  payment_receipt_url TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'pending'
);

ALTER TABLE public.registration_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own registration fees"
ON public.registration_fees
FOR SELECT
USING (member_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage all registration fees"
ON public.registration_fees
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add breakdown_type to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS breakdown_type TEXT DEFAULT '80_20';

-- =============================================
-- PHASE 3: CONTRIBUTION MODULE
-- =============================================

-- Update contributions table
ALTER TABLE public.contributions
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS contribution_month DATE,
ADD COLUMN IF NOT EXISTS breakdown_type TEXT DEFAULT '80_20',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (member_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Members can create their own withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (member_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage all withdrawal requests"
ON public.withdrawal_requests
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- PHASE 4: DIVIDEND MODULE
-- =============================================

-- Update dividends table
ALTER TABLE public.dividends
ADD COLUMN IF NOT EXISTS total_profit NUMERIC,
ADD COLUMN IF NOT EXISTS distribution_id UUID,
ADD COLUMN IF NOT EXISTS member_capital_at_distribution NUMERIC,
ADD COLUMN IF NOT EXISTS dividend_percentage NUMERIC;

-- Create dividend_distributions table
CREATE TABLE IF NOT EXISTS public.dividend_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id),
  total_profit NUMERIC NOT NULL,
  distribution_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_capital_pool NUMERIC NOT NULL,
  eligible_members_count INTEGER NOT NULL,
  status TEXT DEFAULT 'calculated',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.dividend_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view dividend distributions"
ON public.dividend_distributions
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage dividend distributions"
ON public.dividend_distributions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- PHASE 5: COMMISSION & FINANCIAL TRACKING
-- =============================================

-- Create commission_settlements table
CREATE TABLE IF NOT EXISTS public.commission_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_month DATE NOT NULL,
  state TEXT,
  referral_count INTEGER DEFAULT 0,
  total_referral_commission NUMERIC DEFAULT 0,
  state_rep_commission NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  settled_at TIMESTAMP WITH TIME ZONE,
  settled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.commission_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view commission settlements"
ON public.commission_settlements
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage commission settlements"
ON public.commission_settlements
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create state_representatives table
CREATE TABLE IF NOT EXISTS public.state_representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  rep_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  whatsapp_number TEXT,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.state_representatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view state representatives"
ON public.state_representatives
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage state representatives"
ON public.state_representatives
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate 6-digit PIN
CREATE OR REPLACE FUNCTION public.generate_pin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN lpad(floor(random() * 1000000)::text, 6, '0');
END;
$$;

-- Function to generate unique member number
CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: WB + Year + 5 random digits
    new_number := 'WB' || to_char(now(), 'YY') || lpad(floor(random() * 100000)::text, 5, '0');
    
    -- Check if number already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE member_number = new_number) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN new_number;
END;
$$;

-- Function to check if member is eligible for dividends
CREATE OR REPLACE FUNCTION public.check_dividend_eligibility(p_member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- Check eligibility: 6+ months and ≥₦50,000 capital
  RETURN (months_contributed >= 6 AND total_capital >= 50000);
END;
$$;