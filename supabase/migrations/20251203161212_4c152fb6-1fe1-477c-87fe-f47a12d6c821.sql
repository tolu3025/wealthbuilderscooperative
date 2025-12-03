-- Fix admin_change_user_password to check admin role properly
CREATE OR REPLACE FUNCTION public.admin_change_user_password(p_user_id uuid, p_new_password text)
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

  UPDATE auth.users 
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')) 
  WHERE id = p_user_id;
  
  RETURN true;
END;
$function$;

-- Fix admin_delete_user to check admin role properly
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

  -- Delete from related tables first
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.dismissed_announcements WHERE user_id = p_user_id;
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id;
  DELETE FROM public.contributions WHERE approved_by = p_user_id;
  DELETE FROM public.dividend_distributions WHERE created_by = p_user_id;
  DELETE FROM public.commission_settlements WHERE settled_by = p_user_id;
  DELETE FROM public.financial_allocations WHERE settled_by = p_user_id;
  DELETE FROM public.withdrawal_requests WHERE processed_by = p_user_id;

  -- Finally delete the auth user
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RETURN true;
END;
$function$;