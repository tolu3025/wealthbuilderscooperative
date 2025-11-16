-- First, let's check if the trigger exists and recreate it properly
DROP TRIGGER IF EXISTS on_profile_created_mlm_tree ON public.profiles;

-- Recreate the trigger to ensure it fires for new profiles
CREATE TRIGGER on_profile_created_mlm_tree
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_member_mlm_tree();

-- Now assign all existing active members who are not in the MLM tree
DO $$
DECLARE
  member_record RECORD;
BEGIN
  FOR member_record IN 
    SELECT p.id, p.invited_by
    FROM public.profiles p
    LEFT JOIN public.mlm_tree mt ON p.id = mt.member_id
    WHERE p.registration_status = 'active'
      AND mt.member_id IS NULL
      AND p.id != '00000000-0000-0000-0000-000000000001'
    ORDER BY p.created_at ASC
  LOOP
    -- Assign each member to the MLM tree
    PERFORM public.assign_to_mlm_tree(member_record.id, member_record.invited_by);
    RAISE NOTICE 'Assigned member % to MLM tree', member_record.id;
  END LOOP;
END $$;