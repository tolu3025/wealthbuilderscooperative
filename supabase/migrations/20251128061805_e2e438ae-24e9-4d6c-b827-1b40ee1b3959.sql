-- Create table for member upgrade requests
CREATE TABLE public.member_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  breakdown_type TEXT NOT NULL CHECK (breakdown_type IN ('80_20', '100_capital')),
  receipt_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  decline_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Members can insert their own upgrade requests
CREATE POLICY "Members can create their own upgrade requests"
ON public.member_upgrade_requests
FOR INSERT
TO authenticated
WITH CHECK (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Members can view their own upgrade requests
CREATE POLICY "Members can view their own upgrade requests"
ON public.member_upgrade_requests
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Admins can view all upgrade requests
CREATE POLICY "Admins can view all upgrade requests"
ON public.member_upgrade_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all upgrade requests
CREATE POLICY "Admins can update upgrade requests"
ON public.member_upgrade_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_upgrade_requests_status ON public.member_upgrade_requests(status);
CREATE INDEX idx_upgrade_requests_member_id ON public.member_upgrade_requests(member_id);