-- Create the company/system profile for MLM tree root
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  registration_status,
  invite_code
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'WealthBuilders',
  'System',
  'system@wealthbuilders.coop',
  'active',
  'SYSTEM00'
) ON CONFLICT (id) DO NOTHING;

-- Also create the MLM tree root node for the company
INSERT INTO public.mlm_tree (
  member_id,
  parent_id,
  level,
  position
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL,
  0,
  1
) ON CONFLICT (member_id) DO NOTHING;