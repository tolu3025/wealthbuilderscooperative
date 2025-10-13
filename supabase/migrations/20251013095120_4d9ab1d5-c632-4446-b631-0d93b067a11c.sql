-- Fix RLS policies for user management and role allocation

-- Drop existing restrictive policy on user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create comprehensive admin policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Fix profiles policies for admin management
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- Function to create commissions when registration is approved (including referral)
CREATE OR REPLACE FUNCTION public.create_referral_commissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter_profile_id UUID;
  state_rep_profile_id UUID;
  member_state TEXT;
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get the member's profile to find their inviter and state
    SELECT invited_by, state INTO inviter_profile_id, member_state
    FROM public.profiles
    WHERE id = NEW.member_id;
    
    -- Create referral commission for inviter (₦500)
    IF inviter_profile_id IS NOT NULL THEN
      INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
      VALUES (inviter_profile_id, NEW.member_id, 500, 'referral', 'pending');
    END IF;
    
    -- Get state representative for this member's state
    IF member_state IS NOT NULL THEN
      SELECT rep_profile_id INTO state_rep_profile_id
      FROM public.state_representatives
      WHERE state = member_state;
      
      -- Create state rep commission (₦100)
      IF state_rep_profile_id IS NOT NULL THEN
        INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
        VALUES (state_rep_profile_id, NEW.member_id, 100, 'state_rep', 'pending');
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for referral commissions on registration approval
DROP TRIGGER IF EXISTS trigger_create_referral_commissions ON public.registration_fees;
CREATE TRIGGER trigger_create_referral_commissions
  AFTER UPDATE ON public.registration_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.create_referral_commissions();

-- Make sure contributions are properly set up for RLS
DROP POLICY IF EXISTS "Admins can update contributions" ON public.contributions;

CREATE POLICY "Admins can update all contributions"
  ON public.contributions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));