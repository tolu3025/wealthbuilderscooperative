
-- STEP 1: First delete all MLM distributions (removes FK constraint issue)
DELETE FROM public.mlm_distributions;

-- STEP 2: Update MLM Tree Structure
-- Move nftvaluetrades@gmail.com (6c87866d-3b0f-45f1-ade2-ed61c06fb2f8) to level 0 as root
UPDATE public.mlm_tree
SET level = 0, parent_id = NULL, position = 1
WHERE member_id = '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';

-- Reassign all members who were directly under the old placeholder to be under the new root
UPDATE public.mlm_tree
SET parent_id = '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8'
WHERE parent_id = '00000000-0000-0000-0000-000000000001';

-- Recalculate levels for entire tree (BFS approach)
WITH RECURSIVE tree_levels AS (
  SELECT member_id, 0 as new_level
  FROM public.mlm_tree
  WHERE member_id = '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8'
  
  UNION ALL
  
  SELECT t.member_id, tl.new_level + 1
  FROM public.mlm_tree t
  INNER JOIN tree_levels tl ON t.parent_id = tl.member_id
)
UPDATE public.mlm_tree mt
SET level = tl.new_level
FROM tree_levels tl
WHERE mt.member_id = tl.member_id;

-- STEP 3: Delete the old placeholder from mlm_tree
DELETE FROM public.mlm_tree WHERE member_id = '00000000-0000-0000-0000-000000000001';

-- STEP 4: Delete the old placeholder from profiles
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001';

-- STEP 5: Update all database functions to use new root ID (6c87866d-3b0f-45f1-ade2-ed61c06fb2f8)

CREATE OR REPLACE FUNCTION public.distribute_mlm_earnings(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member_id UUID;
  v_distribution_amount NUMERIC := 300;
  v_per_person_amount NUMERIC := 30;
  v_max_member_slots INTEGER := 9;
  v_participant RECORD;
  v_payment_month DATE;
  v_payment_created_at TIMESTAMPTZ;
  v_distributed_count INTEGER := 0;
  v_spillover_amount NUMERIC;
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.project_support_contributions
    WHERE id = p_payment_id AND mlm_distributed = true
  ) THEN
    RETURN;
  END IF;
  
  SELECT member_id, contribution_month, created_at
  INTO v_member_id, v_payment_month, v_payment_created_at
  FROM public.project_support_contributions
  WHERE id = p_payment_id;
  
  PERFORM public.ensure_member_in_mlm_tree(v_member_id);
  
  -- Admin root base share (always gets ₦30)
  INSERT INTO public.mlm_distributions (
    project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
  ) VALUES (p_payment_id, admin_root_id, v_per_person_amount, v_distribution_amount, 10, true);
  
  -- Payer gets ₦30 immediately
  INSERT INTO public.mlm_distributions (
    project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
  ) VALUES (p_payment_id, v_member_id, v_per_person_amount, v_distribution_amount, 10, false);
  
  v_distributed_count := 1;
  
  FOR v_participant IN
    SELECT DISTINCT ON (mt.member_id) mt.member_id
    FROM public.mlm_tree mt
    INNER JOIN public.profiles p ON mt.member_id = p.id
    WHERE mt.member_id != admin_root_id
      AND mt.member_id != v_member_id
      AND p.registration_status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.project_support_contributions psc
        WHERE psc.member_id = mt.member_id
          AND psc.payment_status = 'approved'
          AND DATE_TRUNC('month', psc.contribution_month) = DATE_TRUNC('month', v_payment_month)
          AND psc.created_at < v_payment_created_at
      )
    ORDER BY mt.member_id, mt.level ASC, mt.created_at ASC
    LIMIT 8
  LOOP
    INSERT INTO public.mlm_distributions (
      project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
    ) VALUES (p_payment_id, v_participant.member_id, v_per_person_amount, v_distribution_amount, 10, false);
    v_distributed_count := v_distributed_count + 1;
  END LOOP;
  
  IF v_distributed_count < v_max_member_slots THEN
    v_spillover_amount := (v_max_member_slots - v_distributed_count) * v_per_person_amount;
    INSERT INTO public.mlm_distributions (
      project_support_payment_id, member_id, amount, distribution_pool, participants_count, is_company_share
    ) VALUES (p_payment_id, admin_root_id, v_spillover_amount, v_distribution_amount, 10, true);
  END IF;
  
  UPDATE public.project_support_contributions SET mlm_distributed = true WHERE id = p_payment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_available_mlm_parent()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  available_parent UUID;
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  SELECT member_id INTO available_parent
  FROM public.mlm_tree
  WHERE member_id NOT IN (
    SELECT parent_id FROM public.mlm_tree WHERE parent_id IS NOT NULL GROUP BY parent_id HAVING COUNT(*) >= 3
  )
  ORDER BY level ASC, created_at ASC
  LIMIT 1;
  
  IF available_parent IS NULL THEN
    available_parent := admin_root_id;
  END IF;
  
  RETURN available_parent;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_to_mlm_tree(p_member_id uuid, p_inviter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_parent_id UUID;
  v_parent_level INTEGER;
  v_next_position INTEGER;
  v_children_count INTEGER;
  v_existing_positions INTEGER[];
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  IF EXISTS (SELECT 1 FROM public.mlm_tree WHERE member_id = p_member_id) THEN RETURN; END IF;
  
  IF p_inviter_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_children_count FROM public.mlm_tree WHERE parent_id = p_inviter_id;
    IF v_children_count < 3 THEN v_parent_id := p_inviter_id;
    ELSE v_parent_id := public.find_available_mlm_parent(); END IF;
  ELSE
    v_parent_id := public.find_available_mlm_parent();
  END IF;
  
  SELECT level INTO v_parent_level FROM public.mlm_tree WHERE member_id = v_parent_id;
  IF v_parent_level IS NULL THEN v_parent_level := 0; END IF;
  
  SELECT ARRAY_AGG(position) INTO v_existing_positions FROM public.mlm_tree WHERE parent_id = v_parent_id;
  
  IF v_existing_positions IS NULL OR NOT (1 = ANY(v_existing_positions)) THEN v_next_position := 1;
  ELSIF NOT (2 = ANY(v_existing_positions)) THEN v_next_position := 2;
  ELSIF NOT (3 = ANY(v_existing_positions)) THEN v_next_position := 3;
  ELSE v_parent_id := public.find_available_mlm_parent(); v_next_position := 1; END IF;
  
  INSERT INTO public.mlm_tree (member_id, parent_id, level, position)
  VALUES (p_member_id, v_parent_id, v_parent_level + 1, v_next_position);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_member_in_mlm_tree(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter_id UUID;
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  IF p_member_id = admin_root_id THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.mlm_tree WHERE member_id = p_member_id) THEN RETURN; END IF;
  SELECT invited_by INTO v_inviter_id FROM public.profiles WHERE id = p_member_id;
  PERFORM public.assign_to_mlm_tree(p_member_id, v_inviter_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_parent_id uuid;
  admin_root_id uuid := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = p_user_id;
  
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.dismissed_announcements WHERE user_id = p_user_id;
  
  IF v_profile_id IS NOT NULL THEN
    SELECT parent_id INTO v_parent_id FROM public.mlm_tree WHERE member_id = v_profile_id;
    IF v_parent_id IS NULL THEN v_parent_id := admin_root_id; END IF;
    
    UPDATE public.mlm_tree SET parent_id = v_parent_id WHERE parent_id = v_profile_id;
    DELETE FROM public.mlm_distributions WHERE member_id = v_profile_id;
    DELETE FROM public.mlm_distributions WHERE project_support_payment_id IN (
      SELECT id FROM public.project_support_contributions WHERE member_id = v_profile_id
    );
    
    UPDATE public.member_balances mb SET total_commissions = (
      SELECT COALESCE(SUM(c.amount), 0) FROM public.commissions c WHERE c.member_id = mb.member_id AND c.status = 'approved'
    ) + (
      SELECT COALESCE(SUM(md.amount), 0) FROM public.mlm_distributions md WHERE md.member_id = mb.member_id AND md.is_company_share = false
    ) - (
      SELECT COALESCE(SUM(wr.amount), 0) FROM public.withdrawal_requests wr WHERE wr.member_id = mb.member_id AND wr.withdrawal_type = 'bonus' AND wr.status = 'approved'
    ), updated_at = now() WHERE mb.member_id IS NOT NULL;
    
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
    
    UPDATE public.profiles SET invited_by = NULL WHERE invited_by = v_profile_id;
    DELETE FROM public.profiles WHERE id = v_profile_id;
  END IF;
  
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
END;
$function$;

-- STEP 6: Reset PSF distribution flags
UPDATE public.project_support_contributions SET mlm_distributed = false WHERE payment_status = 'approved';

-- STEP 7: Redistribute for each approved PSF payment in chronological order
DO $$
DECLARE
  psc_record RECORD;
BEGIN
  FOR psc_record IN
    SELECT id FROM public.project_support_contributions WHERE payment_status = 'approved' ORDER BY created_at ASC
  LOOP
    PERFORM public.distribute_mlm_earnings(psc_record.id);
  END LOOP;
END $$;

-- STEP 8: Recalculate all member commission balances
SELECT public.recalculate_member_commission_balances();
