-- Remove any monthly upload restrictions for PSF
-- Update RLS policies on project_support_contributions to allow multiple uploads per month

DROP POLICY IF EXISTS "Members can create their own project support contributions" ON public.project_support_contributions;

CREATE POLICY "Members can create their own project support contributions"
ON public.project_support_contributions
FOR INSERT
TO authenticated
WITH CHECK (
  member_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Ensure notifications can be created by the system
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at 
ON public.notifications(user_id, created_at DESC);

-- Add index for PSF status queries
CREATE INDEX IF NOT EXISTS idx_project_support_status 
ON public.project_support_contributions(payment_status, created_at DESC);