-- Fix the create_referral_commissions trigger to prevent duplicate entries
-- Drop all triggers that depend on the function
DROP TRIGGER IF EXISTS trigger_create_referral_commissions ON public.registration_fees;
DROP TRIGGER IF EXISTS create_commissions_on_registration_approval ON public.registration_fees;
DROP TRIGGER IF EXISTS create_referral_commissions_trigger ON public.registration_fees;

-- Drop the function with CASCADE
DROP FUNCTION IF EXISTS public.create_referral_commissions() CASCADE;

-- Recreate the improved function with duplicate prevention
CREATE OR REPLACE FUNCTION public.create_referral_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- Create referral commission for the inviter (₦1,000) - check for existing first
    IF inviter_profile_id IS NOT NULL THEN
      -- Only insert if commission doesn't already exist for this member
      INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
      SELECT inviter_profile_id, NEW.member_id, 1000, 'referral', 'pending'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.commissions 
        WHERE member_id = inviter_profile_id 
        AND invited_member_id = NEW.member_id 
        AND commission_type = 'referral'
      );
    END IF;
    
    -- Get state representative for this member's state
    IF member_state IS NOT NULL THEN
      SELECT rep_profile_id INTO state_rep_profile_id
      FROM public.state_representatives
      WHERE state = member_state;
      
      -- Create state rep commission (₦100) - check for existing first
      IF state_rep_profile_id IS NOT NULL THEN
        INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
        SELECT state_rep_profile_id, NEW.member_id, 100, 'state_rep', 'pending'
        WHERE NOT EXISTS (
          SELECT 1 FROM public.commissions 
          WHERE member_id = state_rep_profile_id 
          AND invited_member_id = NEW.member_id 
          AND commission_type = 'state_rep'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create single trigger with correct name
CREATE TRIGGER trigger_create_referral_commissions
AFTER INSERT OR UPDATE ON public.registration_fees
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_commissions();