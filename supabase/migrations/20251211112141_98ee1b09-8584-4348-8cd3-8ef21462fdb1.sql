
-- Fix the MLM tree structure by reassigning members to their actual inviters
-- Then redistribute all MLM earnings

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
  -- Step 1: Delete all MLM tree entries except the admin root
  DELETE FROM public.mlm_tree WHERE member_id != admin_root_id;
  
  RAISE NOTICE 'Cleared MLM tree, rebuilding...';
  
  -- Step 2: Rebuild the tree in order of registration (created_at)
  FOR member_record IN 
    SELECT p.id, p.invited_by, p.first_name || ' ' || p.last_name as name
    FROM public.profiles p
    WHERE p.id != admin_root_id
      AND p.registration_status = 'active'
    ORDER BY p.created_at ASC
  LOOP
    v_inviter_id := member_record.invited_by;
    
    -- Determine parent: use inviter if they have space, otherwise find available parent in inviter's subtree
    IF v_inviter_id IS NOT NULL THEN
      -- Check if inviter has space (< 3 children)
      SELECT COUNT(*) INTO v_children_count
      FROM public.mlm_tree
      WHERE parent_id = v_inviter_id;
      
      IF v_children_count < 3 THEN
        v_parent_id := v_inviter_id;
      ELSE
        -- Inviter full - find space in inviter's subtree
        v_parent_id := public.find_available_parent_in_subtree(v_inviter_id);
        IF v_parent_id IS NULL THEN
          v_parent_id := admin_root_id;
        END IF;
      END IF;
    ELSE
      -- No inviter - place under admin root
      v_parent_id := admin_root_id;
    END IF;
    
    -- Get parent's level
    SELECT level INTO v_parent_level
    FROM public.mlm_tree
    WHERE member_id = v_parent_id;
    
    IF v_parent_level IS NULL THEN
      v_parent_level := 0;
    END IF;
    
    -- Find next available position (1, 2, or 3)
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
    
    -- Insert into tree
    INSERT INTO public.mlm_tree (member_id, parent_id, level, position)
    VALUES (member_record.id, v_parent_id, v_parent_level + 1, v_next_position);
    
    RAISE NOTICE 'Added % under parent at level %', member_record.name, v_parent_level + 1;
  END LOOP;
  
  RAISE NOTICE 'MLM tree rebuild complete!';
END $$;

-- Step 3: Clear all MLM distributions and re-run
DELETE FROM public.mlm_distributions;

UPDATE public.project_support_contributions 
SET mlm_distributed = false 
WHERE payment_status = 'approved';

-- Step 4: Re-distribute for all approved PSF payments
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

-- Step 5: Recalculate all member balances
SELECT public.recalculate_member_commission_balances();
