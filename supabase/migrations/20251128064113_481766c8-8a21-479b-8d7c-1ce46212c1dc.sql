-- Allow admins to insert contributions (needed for approving account upgrades)
CREATE POLICY "Admins can insert contributions"
ON public.contributions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));