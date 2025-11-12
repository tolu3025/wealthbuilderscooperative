-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Admins can update project support contributions" ON public.project_support_contributions;

-- Recreate the UPDATE policy with both USING and WITH CHECK
CREATE POLICY "Admins can update project support contributions"
ON public.project_support_contributions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));