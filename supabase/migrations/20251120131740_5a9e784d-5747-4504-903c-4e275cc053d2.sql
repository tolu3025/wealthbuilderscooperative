-- Update the create_referral_commissions function to use ₦1,000 for referral commission
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
    
    -- Create referral commission for the inviter (₦1,000)
    IF inviter_profile_id IS NOT NULL THEN
      INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
      VALUES (inviter_profile_id, NEW.member_id, 1000, 'referral', 'pending');
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
$function$;