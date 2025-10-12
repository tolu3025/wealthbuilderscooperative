-- Fix contributions INSERT policy
CREATE POLICY "Members can create their own contributions"
ON public.contributions
FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Admins can view all payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Members can view their own payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload payment receipts" ON storage.objects;

-- Recreate storage policies for payment-receipts bucket
CREATE POLICY "Admins can view all payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Members can view their own payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Members can upload payment receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'contribution_approval', 'blog_post', 'withdrawal_status', 'referral'
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  related_id UUID -- optional reference to related record
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notification policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (
  user_id IN (
    SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (
  user_id IN (
    SELECT user_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;