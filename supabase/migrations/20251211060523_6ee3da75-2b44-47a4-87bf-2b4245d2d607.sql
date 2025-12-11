-- Re-create the trigger to place members in MLM tree at registration
-- This was missing, causing referrals to not be placed under their inviters

CREATE TRIGGER on_new_member_mlm_tree
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_member_mlm_tree();

-- Sync the 4 missing members to the MLM tree under their correct inviters
SELECT public.sync_all_members_to_mlm_tree();