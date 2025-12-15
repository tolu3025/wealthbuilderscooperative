-- Add DELETE policy for members to cancel their own enrollments
CREATE POLICY "Members can delete their own enrollments"
ON public.plan_enrollments
FOR DELETE
USING (member_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));