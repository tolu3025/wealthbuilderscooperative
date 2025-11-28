-- Backfill missing referral commissions for active members
-- This creates commissions for all active members whose inviters never received commissions

DO $$
DECLARE
  referred_member RECORD;
  inviter_profile_id UUID;
  state_rep_profile_id UUID;
  member_state TEXT;
BEGIN
  -- Loop through all active members who were invited but don't have commissions created
  FOR referred_member IN 
    SELECT DISTINCT p.id, p.invited_by, p.state
    FROM profiles p
    WHERE p.registration_status = 'active'
      AND p.invited_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM commissions 
        WHERE invited_member_id = p.id 
        AND commission_type = 'referral'
      )
  LOOP
    inviter_profile_id := referred_member.invited_by;
    member_state := referred_member.state;
    
    -- Create referral commission for inviter (₦1,000)
    IF inviter_profile_id IS NOT NULL THEN
      INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
      VALUES (inviter_profile_id, referred_member.id, 1000, 'referral', 'approved')
      ON CONFLICT DO NOTHING;
      
      -- Update member balance immediately
      INSERT INTO public.member_balances (member_id, total_commissions)
      VALUES (inviter_profile_id, 1000)
      ON CONFLICT (member_id) 
      DO UPDATE SET
        total_commissions = member_balances.total_commissions + 1000,
        updated_at = now();
    END IF;
    
    -- Create state rep commission (₦100)
    IF member_state IS NOT NULL THEN
      SELECT rep_profile_id INTO state_rep_profile_id
      FROM public.state_representatives
      WHERE state = member_state;
      
      IF state_rep_profile_id IS NOT NULL THEN
        INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
        VALUES (state_rep_profile_id, referred_member.id, 100, 'state_rep', 'approved')
        ON CONFLICT DO NOTHING;
        
        -- Update state rep balance
        INSERT INTO public.member_balances (member_id, total_commissions)
        VALUES (state_rep_profile_id, 100)
        ON CONFLICT (member_id) 
        DO UPDATE SET
          total_commissions = member_balances.total_commissions + 100,
          updated_at = now();
      END IF;
    END IF;
  END LOOP;
END $$;

-- Also update registration_fees status to 'approved' for all active members
-- This ensures the trigger will work correctly going forward
UPDATE public.registration_fees
SET status = 'approved'
WHERE member_id IN (
  SELECT id FROM profiles WHERE registration_status = 'active'
)
AND status = 'pending';