-- Drop existing policy
DROP POLICY IF EXISTS "Members can view their own dividends" ON public.dividends;

-- Create improved policy for members to view their dividends
CREATE POLICY "Members can view their own dividends" 
ON public.dividends 
FOR SELECT 
USING (
  member_id IN (
    SELECT id 
    FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);