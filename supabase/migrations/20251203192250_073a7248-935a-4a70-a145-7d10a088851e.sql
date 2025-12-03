-- Fix the assign_to_mlm_tree function to calculate next available position (1, 2, or 3)
-- instead of MAX(position) + 1 which can violate the check constraint

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
BEGIN
  -- Check if already in tree
  IF EXISTS (SELECT 1 FROM public.mlm_tree WHERE member_id = p_member_id) THEN
    RETURN;
  END IF;
  
  -- Determine parent
  IF p_inviter_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_children_count
    FROM public.mlm_tree
    WHERE parent_id = p_inviter_id;
    
    IF v_children_count < 3 THEN
      v_parent_id := p_inviter_id;
    ELSE
      v_parent_id := public.find_available_mlm_parent();
    END IF;
  ELSE
    v_parent_id := public.find_available_mlm_parent();
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
    -- This should not happen if find_available_mlm_parent works correctly
    -- But just in case, find another parent
    v_parent_id := public.find_available_mlm_parent();
    v_next_position := 1;
  END IF;
  
  INSERT INTO public.mlm_tree (member_id, parent_id, level, position)
  VALUES (p_member_id, v_parent_id, v_parent_level + 1, v_next_position);
END;
$function$;