-- Clean up orphan auth users (users without profiles)
-- This deletes auth.users entries that have no corresponding profile record

DELETE FROM auth.users
WHERE id IN (
  SELECT a.id 
  FROM auth.users a 
  LEFT JOIN public.profiles p ON a.id = p.user_id 
  WHERE p.id IS NULL
);