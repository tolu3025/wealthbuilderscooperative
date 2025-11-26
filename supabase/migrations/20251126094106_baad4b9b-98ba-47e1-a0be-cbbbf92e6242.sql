-- Create RLS policies for project_support_contributions table

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all PSF contributions" ON public.project_support_contributions;
DROP POLICY IF EXISTS "Members can view their own PSF contributions" ON public.project_support_contributions;
DROP POLICY IF EXISTS "Members can insert their own PSF contributions" ON public.project_support_contributions;
DROP POLICY IF EXISTS "Admins can update PSF contributions" ON public.project_support_contributions;

-- Policy for admins to view all PSF contributions
CREATE POLICY "Admins can view all PSF contributions"
ON public.project_support_contributions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy for members to view their own PSF contributions
CREATE POLICY "Members can view their own PSF contributions"
ON public.project_support_contributions
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Policy for members to insert their own PSF contributions
CREATE POLICY "Members can insert their own PSF contributions"
ON public.project_support_contributions
FOR INSERT
TO authenticated
WITH CHECK (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Policy for admins to update PSF contributions (for approval/decline)
CREATE POLICY "Admins can update PSF contributions"
ON public.project_support_contributions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);