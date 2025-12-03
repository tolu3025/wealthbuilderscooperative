-- Drop the existing function
DROP FUNCTION IF EXISTS public.admin_delete_user(text);
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid);

-- Recreate the function with proper type handling
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Get the profile id for this user
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = p_user_id;
  
  -- Delete related records (in order of dependencies)
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.dismissed_announcements WHERE user_id = p_user_id;
  
  IF v_profile_id IS NOT NULL THEN
    -- Delete profile-related records
    DELETE FROM public.commissions WHERE member_id = v_profile_id OR invited_member_id = v_profile_id;
    DELETE FROM public.contributions WHERE member_id = v_profile_id;
    DELETE FROM public.dividends WHERE member_id = v_profile_id;
    DELETE FROM public.withdrawal_requests WHERE member_id = v_profile_id;
    DELETE FROM public.member_balances WHERE member_id = v_profile_id;
    DELETE FROM public.registration_fees WHERE member_id = v_profile_id;
    DELETE FROM public.project_support_contributions WHERE member_id = v_profile_id;
    DELETE FROM public.mlm_distributions WHERE member_id = v_profile_id;
    DELETE FROM public.mlm_tree WHERE member_id = v_profile_id OR parent_id = v_profile_id;
    DELETE FROM public.plan_enrollments WHERE member_id = v_profile_id;
    DELETE FROM public.member_upgrade_requests WHERE member_id = v_profile_id;
    DELETE FROM public.state_representatives WHERE rep_profile_id = v_profile_id;
    DELETE FROM public.director_assignments WHERE director_profile_id = v_profile_id;
    
    -- Delete the profile
    DELETE FROM public.profiles WHERE id = v_profile_id;
  END IF;
  
  -- Delete the auth user (this requires service_role key)
  -- Note: This will only work if the function is called with proper permissions
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
END;
$$;