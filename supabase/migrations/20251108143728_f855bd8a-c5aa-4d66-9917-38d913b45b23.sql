-- Add member type enum and column
CREATE TYPE public.member_type AS ENUM ('contributor', 'acting_member');

-- Add member_type column to profiles
ALTER TABLE public.profiles 
ADD COLUMN member_type public.member_type DEFAULT 'contributor';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.member_type IS 'Contributor pays ₦5,500 monthly and receives dividends. Acting Member pays ₦500 monthly without dividends.';

-- Create table for project support contributions (separate from main contributions)
CREATE TABLE public.project_support_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL DEFAULT 500,
  receipt_url TEXT,
  payment_status TEXT DEFAULT 'pending',
  contribution_month DATE,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_support_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project support contributions
CREATE POLICY "Members can create their own project support contributions"
ON public.project_support_contributions
FOR INSERT
TO authenticated
WITH CHECK (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can view their own project support contributions"
ON public.project_support_contributions
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all project support contributions"
ON public.project_support_contributions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update project support contributions"
ON public.project_support_contributions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));