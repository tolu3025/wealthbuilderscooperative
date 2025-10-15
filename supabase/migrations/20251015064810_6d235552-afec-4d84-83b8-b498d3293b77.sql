-- Create missing state rep commission for Williams Oyetade (Oyo state rep)
-- He should receive ₦100 commission for his own registration in Oyo state
INSERT INTO public.commissions (member_id, invited_member_id, amount, commission_type, status)
SELECT 
  sr.rep_profile_id as member_id,
  p.id as invited_member_id,
  100 as amount,
  'state_rep' as commission_type,
  'pending' as status
FROM profiles p
JOIN registration_fees rf ON rf.member_id = p.id
JOIN state_representatives sr ON sr.state = p.state
WHERE p.registration_status = 'active' 
  AND rf.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM commissions c 
    WHERE c.invited_member_id = p.id 
    AND c.commission_type = 'state_rep'
  );