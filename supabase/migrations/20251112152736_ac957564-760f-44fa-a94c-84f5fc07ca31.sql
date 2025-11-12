-- Drop existing RLS policies on project_support_contributions
DROP POLICY IF EXISTS "Admins can update project support contributions" ON public.project_support_contributions;
DROP POLICY IF EXISTS "Admins can view all project support contributions" ON public.project_support_contributions;
DROP POLICY IF EXISTS "Members can create their own project support contributions" ON public.project_support_contributions;
DROP POLICY IF EXISTS "Members can view their own project support contributions" ON public.project_support_contributions;

-- Recreate simplified RLS policies for project_support_contributions
-- Admin can view all
CREATE POLICY "Admins can view all project support contributions"
ON public.project_support_contributions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update all (no complex joins that cause DISTINCT issues)
CREATE POLICY "Admins can update project support contributions"
ON public.project_support_contributions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Members can view their own
CREATE POLICY "Members can view their own project support contributions"
ON public.project_support_contributions
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Members can insert their own
CREATE POLICY "Members can create their own project support contributions"
ON public.project_support_contributions
FOR INSERT
TO authenticated
WITH CHECK (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);