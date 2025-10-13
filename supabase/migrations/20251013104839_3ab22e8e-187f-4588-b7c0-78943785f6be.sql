-- Fix notifications table RLS policies to allow system to create notifications
-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Create new policies that allow notification creation
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT user_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT user_id 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to create notifications for any user
-- This is needed for system notifications (contribution approvals, etc.)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);