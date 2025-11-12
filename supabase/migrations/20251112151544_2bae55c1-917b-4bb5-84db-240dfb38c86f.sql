-- Create security definer function to approve project support contributions
-- This bypasses RLS to avoid the SELECT DISTINCT, ORDER BY conflict
CREATE OR REPLACE FUNCTION public.approve_project_support_contribution(
  p_contribution_id UUID,
  p_admin_profile_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can approve contributions';
  END IF;
  
  -- Update the contribution
  UPDATE public.project_support_contributions
  SET 
    payment_status = 'approved',
    approved_at = now(),
    approved_by = p_admin_profile_id
  WHERE id = p_contribution_id;
END;
$$;