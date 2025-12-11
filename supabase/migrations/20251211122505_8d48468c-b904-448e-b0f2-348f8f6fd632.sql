-- Part 1: Create fallback trigger for when profiles.invited_by is updated
-- This catches cases where cached code didn't pass invited_by during registration

CREATE OR REPLACE FUNCTION public.fix_mlm_placement_on_invited_by_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current_parent_id UUID;
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  -- Only process if invited_by changed from NULL to a value, or changed to a different value
  IF NEW.invited_by IS NOT NULL AND (OLD.invited_by IS NULL OR OLD.invited_by != NEW.invited_by) THEN
    -- Check if member is currently placed under admin root (incorrect placement)
    SELECT parent_id INTO v_current_parent_id
    FROM public.mlm_tree
    WHERE member_id = NEW.id;
    
    -- If currently under admin root but should be under their inviter's tree, fix it
    IF v_current_parent_id = admin_root_id AND NEW.invited_by != admin_root_id THEN
      -- Delete incorrect placement
      DELETE FROM public.mlm_tree WHERE member_id = NEW.id;
      
      -- Re-assign correctly under inviter's tree
      PERFORM public.assign_to_mlm_tree(NEW.id, NEW.invited_by);
      
      RAISE NOTICE 'Fixed MLM placement for member % - moved from admin root to inviter tree', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_profile_invited_by_update ON public.profiles;
CREATE TRIGGER on_profile_invited_by_update
  AFTER UPDATE OF invited_by ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fix_mlm_placement_on_invited_by_update();

-- Part 2: One-time fix for all incorrectly placed members
DO $$
DECLARE
  member_record RECORD;
  admin_root_id UUID := '6c87866d-3b0f-45f1-ade2-ed61c06fb2f8';
BEGIN
  -- Find all members incorrectly placed under admin root who have a different invited_by
  FOR member_record IN 
    SELECT p.id, p.invited_by, p.first_name || ' ' || p.last_name as name
    FROM public.profiles p
    JOIN public.mlm_tree mt ON mt.member_id = p.id
    WHERE mt.parent_id = admin_root_id
      AND p.invited_by IS NOT NULL
      AND p.invited_by != admin_root_id
  LOOP
    RAISE NOTICE 'Fixing placement for %: moving from admin root to inviter tree', member_record.name;
    
    -- Delete incorrect placement
    DELETE FROM public.mlm_tree WHERE member_id = member_record.id;
    
    -- Re-assign correctly
    PERFORM public.assign_to_mlm_tree(member_record.id, member_record.invited_by);
  END LOOP;
  
  RAISE NOTICE 'MLM placement fix complete!';
END $$;

-- Part 3: Clear and redistribute MLM earnings to reflect correct tree structure
DELETE FROM public.mlm_distributions;

UPDATE public.project_support_contributions 
SET mlm_distributed = false 
WHERE payment_status = 'approved';

DO $$
DECLARE
  psf_record RECORD;
BEGIN
  FOR psf_record IN 
    SELECT id FROM public.project_support_contributions 
    WHERE payment_status = 'approved'
    ORDER BY created_at ASC
  LOOP
    PERFORM public.distribute_mlm_earnings(psf_record.id);
  END LOOP;
  RAISE NOTICE 'MLM redistribution complete!';
END $$;

-- Part 4: Recalculate balances
SELECT public.recalculate_member_commission_balances();