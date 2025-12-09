-- Update assign_to_mlm_tree function to use hierarchical spillover
-- When inviter has 3 children, search ONLY within inviter's subtree for available parent
-- This keeps referrals within the inviter's downline hierarchy

-- First, create a helper function to find available parent within a specific subtree
CREATE OR REPLACE FUNCTION public.find_available_parent_in_subtree(p_root_member_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available_parent_id UUID;
  v_queue UUID[];
  v_current_id UUID;
  v_children_count INTEGER;
BEGIN
  -- Start with the root member's children (breadth-first search)
  v_queue := ARRAY(
    SELECT member_id 
    FROM public.mlm_tree 
    WHERE parent_id = p_root_member_id
    ORDER BY position
  );
  
  -- If root has no children yet, this shouldn't be called, but return NULL
  IF array_length(v_queue, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Breadth-first search through the subtree
  WHILE array_length(v_queue, 1) > 0 LOOP
    v_current_id := v_queue[1];
    v_queue := v_queue[2:];
    
    -- Check if this node has < 3 children
    SELECT COUNT(*) INTO v_children_count
    FROM public.mlm_tree
    WHERE parent_id = v_current_id;
    
    IF v_children_count < 3 THEN
      RETURN v_current_id;
    END IF;
    
    -- Add this node's children to the queue for further searching
    v_queue := v_queue || ARRAY(
      SELECT member_id 
      FROM public.mlm_tree 
      WHERE parent_id = v_current_id
      ORDER BY position
    );
  END LOOP;
  
  -- No available parent found in subtree (all nodes have 3 children)
  RETURN NULL;
END;
$$;

-- Update the main assign_to_mlm_tree function for hierarchical spillover
CREATE OR REPLACE FUNCTION public.assign_to_mlm_tree(p_member_id uuid, p_inviter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id UUID;
  v_parent_level INTEGER;
  v_next_position INTEGER;
  v_children_count INTEGER;
  v_existing_positions INTEGER[];
  v_admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8'; -- Admin root
BEGIN
  -- Check if already in tree
  IF EXISTS (SELECT 1 FROM public.mlm_tree WHERE member_id = p_member_id) THEN
    RETURN;
  END IF;
  
  -- Determine parent based on hierarchical spillover logic
  IF p_inviter_id IS NOT NULL THEN
    -- Check if inviter has space (< 3 children)
    SELECT COUNT(*) INTO v_children_count
    FROM public.mlm_tree
    WHERE parent_id = p_inviter_id;
    
    IF v_children_count < 3 THEN
      -- Place directly under inviter
      v_parent_id := p_inviter_id;
    ELSE
      -- Inviter is full - search ONLY within inviter's subtree (hierarchical spillover)
      v_parent_id := public.find_available_parent_in_subtree(p_inviter_id);
      
      -- If no space found in subtree (all descendants have 3 children each),
      -- this is extremely rare but fall back to inviter's first child's subtree
      IF v_parent_id IS NULL THEN
        -- Get the first child of inviter and try their subtree
        SELECT member_id INTO v_parent_id
        FROM public.mlm_tree
        WHERE parent_id = p_inviter_id
        ORDER BY position
        LIMIT 1;
        
        -- If still null, place under admin root (should never happen in practice)
        IF v_parent_id IS NULL THEN
          v_parent_id := v_admin_root_id;
        END IF;
      END IF;
    END IF;
  ELSE
    -- No inviter provided - this should not happen now that invite code is required
    -- Fall back to admin root
    v_parent_id := v_admin_root_id;
  END IF;
  
  -- Get parent's level
  SELECT level INTO v_parent_level
  FROM public.mlm_tree
  WHERE member_id = v_parent_id;
  
  IF v_parent_level IS NULL THEN
    v_parent_level := 0;
  END IF;
  
  -- Find next available position (1, 2, or 3) that's not taken
  SELECT ARRAY_AGG(position) INTO v_existing_positions
  FROM public.mlm_tree
  WHERE parent_id = v_parent_id;
  
  -- Find first available slot (1, 2, or 3)
  IF v_existing_positions IS NULL OR NOT (1 = ANY(v_existing_positions)) THEN
    v_next_position := 1;
  ELSIF NOT (2 = ANY(v_existing_positions)) THEN
    v_next_position := 2;
  ELSIF NOT (3 = ANY(v_existing_positions)) THEN
    v_next_position := 3;
  ELSE
    -- Safety fallback - shouldn't reach here if logic is correct
    v_next_position := 1;
    RAISE WARNING 'Parent % has 3 children but was selected, forcing position 1', v_parent_id;
  END IF;
  
  INSERT INTO public.mlm_tree (member_id, parent_id, level, position)
  VALUES (p_member_id, v_parent_id, v_parent_level + 1, v_next_position);
  
  RAISE NOTICE 'Assigned member % to MLM tree under parent % at position %', p_member_id, v_parent_id, v_next_position;
END;
$$;