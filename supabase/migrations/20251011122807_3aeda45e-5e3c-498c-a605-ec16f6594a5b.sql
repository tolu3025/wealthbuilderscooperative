-- Add INSERT policy for members to create their own registration fee record
CREATE POLICY "Members can create their own registration fee"
ON public.registration_fees
FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);