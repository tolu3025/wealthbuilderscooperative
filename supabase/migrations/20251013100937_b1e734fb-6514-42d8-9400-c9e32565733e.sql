-- Fix both check constraints on commissions table
ALTER TABLE public.commissions 
DROP CONSTRAINT IF EXISTS commissions_commission_type_check;

ALTER TABLE public.commissions 
DROP CONSTRAINT IF EXISTS commissions_status_check;

-- Add proper check constraints
ALTER TABLE public.commissions 
ADD CONSTRAINT commissions_commission_type_check 
CHECK (commission_type IN ('referral', 'state_rep'));

ALTER TABLE public.commissions 
ADD CONSTRAINT commissions_status_check 
CHECK (status IN ('pending', 'approved'));

-- Now backfill missing referral commissions
INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
SELECT DISTINCT
  p_inviter.id as member_id,
  p_invited.id as invited_member_id,
  500 as amount,
  'referral' as commission_type,
  'approved' as status
FROM public.profiles p_invited
INNER JOIN public.profiles p_inviter ON p_invited.invited_by = p_inviter.id
INNER JOIN public.registration_fees rf ON rf.member_id = p_invited.id
WHERE rf.status = 'approved'
  AND p_invited.invited_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.commissions c 
    WHERE c.member_id = p_inviter.id 
      AND c.invited_member_id = p_invited.id 
      AND c.commission_type = 'referral'
  );

-- Insert missing state rep commissions (₦100 for state rep)
INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
SELECT DISTINCT
  sr.rep_profile_id as member_id,
  p_invited.id as invited_member_id,
  100 as amount,
  'state_rep' as commission_type,
  'approved' as status
FROM public.profiles p_invited
INNER JOIN public.state_representatives sr ON p_invited.state = sr.state
INNER JOIN public.registration_fees rf ON rf.member_id = p_invited.id
WHERE rf.status = 'approved'
  AND sr.rep_profile_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.commissions c 
    WHERE c.member_id = sr.rep_profile_id 
      AND c.invited_member_id = p_invited.id 
      AND c.commission_type = 'state_rep'
  );