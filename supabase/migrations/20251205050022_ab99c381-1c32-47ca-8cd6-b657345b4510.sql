-- Fix 1: Update contributions payment_status check constraint to allow 'declined'
ALTER TABLE public.contributions DROP CONSTRAINT IF EXISTS contributions_payment_status_check;
ALTER TABLE public.contributions ADD CONSTRAINT contributions_payment_status_check 
  CHECK (payment_status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text]));

-- Fix 2: Fix admin_delete_user function - the UPDATE was missing WHERE clause
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_parent_id uuid;
  company_root_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Get the profile id for this user
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = p_user_id;
  
  -- Delete related records (in order of dependencies)
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.dismissed_announcements WHERE user_id = p_user_id;
  
  IF v_profile_id IS NOT NULL THEN
    -- Get the deleted user's parent in MLM tree before removing
    SELECT parent_id INTO v_parent_id
    FROM public.mlm_tree
    WHERE member_id = v_profile_id;
    
    -- If no parent found, use company root
    IF v_parent_id IS NULL THEN
      v_parent_id := company_root_id;
    END IF;
    
    -- Reassign children to the deleted user's parent (or company root)
    UPDATE public.mlm_tree
    SET parent_id = v_parent_id
    WHERE parent_id = v_profile_id;
    
    -- Delete MLM distributions where this member received earnings
    DELETE FROM public.mlm_distributions WHERE member_id = v_profile_id;
    
    -- Delete MLM distributions that originated from this member's PSF payments
    DELETE FROM public.mlm_distributions 
    WHERE project_support_payment_id IN (
      SELECT id FROM public.project_support_contributions WHERE member_id = v_profile_id
    );
    
    -- Recalculate balances for all members who may have been affected
    -- Using explicit WHERE clause to update only members with balance records
    UPDATE public.member_balances mb
    SET total_commissions = (
      SELECT COALESCE(SUM(c.amount), 0)
      FROM public.commissions c
      WHERE c.member_id = mb.member_id AND c.status = 'approved'
    ) + (
      SELECT COALESCE(SUM(md.amount), 0)
      FROM public.mlm_distributions md
      WHERE md.member_id = mb.member_id AND md.is_company_share = false
    ) - (
      SELECT COALESCE(SUM(wr.amount), 0)
      FROM public.withdrawal_requests wr
      WHERE wr.member_id = mb.member_id AND wr.withdrawal_type = 'bonus' AND wr.status = 'approved'
    ),
    updated_at = now()
    WHERE mb.member_id IS NOT NULL;
    
    -- Now delete profile-related records
    DELETE FROM public.commissions WHERE member_id = v_profile_id OR invited_member_id = v_profile_id;
    DELETE FROM public.contributions WHERE member_id = v_profile_id;
    DELETE FROM public.dividends WHERE member_id = v_profile_id;
    DELETE FROM public.withdrawal_requests WHERE member_id = v_profile_id;
    DELETE FROM public.member_balances WHERE member_id = v_profile_id;
    DELETE FROM public.registration_fees WHERE member_id = v_profile_id;
    DELETE FROM public.project_support_contributions WHERE member_id = v_profile_id;
    DELETE FROM public.mlm_tree WHERE member_id = v_profile_id;
    DELETE FROM public.plan_enrollments WHERE member_id = v_profile_id;
    DELETE FROM public.member_upgrade_requests WHERE member_id = v_profile_id;
    DELETE FROM public.state_representatives WHERE rep_profile_id = v_profile_id;
    DELETE FROM public.director_assignments WHERE director_profile_id = v_profile_id;
    
    -- Clear invited_by references to this profile
    UPDATE public.profiles SET invited_by = NULL WHERE invited_by = v_profile_id;
    
    -- Delete the profile
    DELETE FROM public.profiles WHERE id = v_profile_id;
  END IF;
  
  -- Delete the auth user
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
END;
$function$;