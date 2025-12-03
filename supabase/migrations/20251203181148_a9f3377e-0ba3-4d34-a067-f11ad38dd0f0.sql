-- Fix admin_delete_user to also delete the profile record
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Check if calling user has admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: Admin role required';
  END IF;

  -- Delete from related tables first (in order of dependencies)
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.dismissed_announcements WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.contributions WHERE approved_by = p_user_id;
  DELETE FROM public.dividend_distributions WHERE created_by = p_user_id;
  DELETE FROM public.commission_settlements WHERE settled_by = p_user_id;
  DELETE FROM public.financial_allocations WHERE settled_by = p_user_id;
  DELETE FROM public.withdrawal_requests WHERE processed_by = p_user_id;
  DELETE FROM public.member_upgrade_requests WHERE reviewed_by = p_user_id;
  DELETE FROM public.project_support_contributions WHERE approved_by = p_user_id;
  
  -- Delete member-specific data linked by member_id (via profile id)
  DELETE FROM public.commissions WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.commissions WHERE invited_member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.contributions WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.dividends WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.withdrawal_requests WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.registration_fees WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.member_balances WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.member_upgrade_requests WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.plan_enrollments WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.project_support_contributions WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.mlm_tree WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  DELETE FROM public.mlm_distributions WHERE member_id IN (SELECT id FROM public.profiles WHERE user_id = p_user_id);
  
  -- Delete the profile
  DELETE FROM public.profiles WHERE user_id = p_user_id;
  
  -- Delete auth related data
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id;

  -- Finally delete the auth user
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RETURN true;
END;
$function$;