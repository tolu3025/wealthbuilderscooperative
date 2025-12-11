-- Part 1: Update handle_new_user() to extract invited_by from metadata
-- This ensures invited_by is set BEFORE the MLM tree trigger fires

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invited_by UUID;
BEGIN
  -- Extract invited_by from metadata (may be null if not provided)
  IF NEW.raw_user_meta_data->>'invited_by' IS NOT NULL THEN
    v_invited_by := (NEW.raw_user_meta_data->>'invited_by')::UUID;
  ELSE
    v_invited_by := NULL;
  END IF;

  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    email,
    phone,
    state,
    invite_code,
    registration_status,
    invited_by
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', ''),
    public.generate_invite_code(),
    'pending_payment',
    v_invited_by
  );
  
  -- Assign default member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- Part 2: Rebuild MLM tree for all existing members with correct placements
DO $$
DECLARE
  member_record RECORD;
  v_inviter_id UUID;
  v_parent_id UUID;
  v_parent_level INTEGER;
  v_next_position INTEGER;
  v_children_count INTEGER;
  v_existing_positions INTEGER[];
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  -- Clear all MLM tree entries except admin root
  DELETE FROM public.mlm_tree WHERE member_id != admin_root_id;
  
  RAISE NOTICE 'Cleared MLM tree, rebuilding with correct placements...';
  
  -- Rebuild tree in registration order
  FOR member_record IN 
    SELECT p.id, p.invited_by, p.first_name || ' ' || p.last_name as name
    FROM public.profiles p
    WHERE p.id != admin_root_id
      AND p.registration_status = 'active'
    ORDER BY p.created_at ASC
  LOOP
    v_inviter_id := member_record.invited_by;
    
    IF v_inviter_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_children_count
      FROM public.mlm_tree
      WHERE parent_id = v_inviter_id;
      
      IF v_children_count < 3 THEN
        v_parent_id := v_inviter_id;
      ELSE
        v_parent_id := public.find_available_parent_in_subtree(v_inviter_id);
        IF v_parent_id IS NULL THEN
          v_parent_id := admin_root_id;
        END IF;
      END IF;
    ELSE
      v_parent_id := admin_root_id;
    END IF;
    
    SELECT level INTO v_parent_level
    FROM public.mlm_tree
    WHERE member_id = v_parent_id;
    
    IF v_parent_level IS NULL THEN
      v_parent_level := 0;
    END IF;
    
    SELECT ARRAY_AGG(position) INTO v_existing_positions
    FROM public.mlm_tree
    WHERE parent_id = v_parent_id;
    
    IF v_existing_positions IS NULL OR NOT (1 = ANY(v_existing_positions)) THEN
      v_next_position := 1;
    ELSIF NOT (2 = ANY(v_existing_positions)) THEN
      v_next_position := 2;
    ELSIF NOT (3 = ANY(v_existing_positions)) THEN
      v_next_position := 3;
    ELSE
      v_next_position := 1;
    END IF;
    
    INSERT INTO public.mlm_tree (member_id, parent_id, level, position)
    VALUES (member_record.id, v_parent_id, v_parent_level + 1, v_next_position);
    
    RAISE NOTICE 'Placed % under their inviter tree at level %', member_record.name, v_parent_level + 1;
  END LOOP;
  
  RAISE NOTICE 'MLM tree rebuild complete!';
END $$;

-- Part 3: Clear and redistribute all MLM earnings
DELETE FROM public.mlm_distributions;

UPDATE public.project_support_contributions 
SET mlm_distributed = false 
WHERE payment_status = 'approved';

DO $$
DECLARE
  psf_record RECORD;
BEGIN
  FOR psf_record IN 
    SELECT id, member_id 
    FROM public.project_support_contributions 
    WHERE payment_status = 'approved'
    ORDER BY created_at ASC
  LOOP
    PERFORM public.distribute_mlm_earnings(psf_record.id);
  END LOOP;
  RAISE NOTICE 'MLM redistribution complete!';
END $$;

-- Part 4: Recalculate all member balances
SELECT public.recalculate_member_commission_balances();