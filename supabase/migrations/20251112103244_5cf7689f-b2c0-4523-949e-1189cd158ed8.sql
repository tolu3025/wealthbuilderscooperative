-- Add missing columns to project_support_contributions if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'project_support_contributions' 
    AND column_name = 'distribution_amount') THEN
    ALTER TABLE public.project_support_contributions ADD COLUMN distribution_amount NUMERIC DEFAULT 300;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'project_support_contributions' 
    AND column_name = 'reserve_amount') THEN
    ALTER TABLE public.project_support_contributions ADD COLUMN reserve_amount NUMERIC DEFAULT 200;
  END IF;
END $$;

-- Create company/system profile for MLM originator (if doesn't exist)
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  member_number,
  registration_status,
  invite_code,
  member_type
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'WealthBuilders',
  'Company',
  'system@wealthbuilders.com',
  'WB00SYSTEM',
  'active',
  'COMPANY01',
  'contributor'
)
ON CONFLICT (id) DO NOTHING;

-- Update/create functions and triggers
CREATE OR REPLACE FUNCTION public.find_available_mlm_parent()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_parent UUID;
BEGIN
  SELECT member_id INTO available_parent
  FROM public.mlm_tree
  WHERE member_id NOT IN (
    SELECT parent_id
    FROM public.mlm_tree
    WHERE parent_id IS NOT NULL
    GROUP BY parent_id
    HAVING COUNT(*) >= 3
  )
  ORDER BY level ASC, created_at ASC
  LIMIT 1;
  
  IF available_parent IS NULL THEN
    available_parent := '00000000-0000-0000-0000-000000000001';
  END IF;
  
  RETURN available_parent;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_to_mlm_tree(p_member_id UUID, p_inviter_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
  v_parent_level INTEGER;
  v_next_position INTEGER;
  v_children_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.mlm_tree WHERE member_id = p_member_id) THEN
    RETURN;
  END IF;
  
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
  
  SELECT level INTO v_parent_level
  FROM public.mlm_tree
  WHERE member_id = v_parent_id;
  
  IF v_parent_level IS NULL THEN
    v_parent_level := 0;
  END IF;
  
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
  FROM public.mlm_tree
  WHERE parent_id = v_parent_id;
  
  INSERT INTO public.mlm_tree (member_id, parent_id, level, position)
  VALUES (p_member_id, v_parent_id, v_parent_level + 1, v_next_position);
END;
$$;

CREATE OR REPLACE FUNCTION public.distribute_mlm_earnings(p_payment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_distribution_amount NUMERIC := 300;
  v_per_person_amount NUMERIC := 30;
  v_participant_count INTEGER := 10;
  v_participant RECORD;
  company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM public.project_support_contributions WHERE id = p_payment_id AND mlm_distributed = true) THEN
    RETURN;
  END IF;
  
  SELECT member_id INTO v_member_id
  FROM public.project_support_contributions
  WHERE id = p_payment_id;
  
  INSERT INTO public.mlm_distributions (
    project_support_payment_id,
    member_id,
    amount,
    distribution_pool,
    participants_count,
    is_company_share
  ) VALUES (
    p_payment_id,
    company_id,
    v_per_person_amount,
    v_distribution_amount,
    v_participant_count,
    true
  );
  
  FOR v_participant IN
    SELECT DISTINCT mt.member_id
    FROM public.mlm_tree mt
    INNER JOIN public.profiles p ON mt.member_id = p.id
    WHERE mt.member_id != company_id
      AND p.registration_status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.project_support_contributions psc
        WHERE psc.member_id = mt.member_id
          AND psc.payment_status = 'approved'
      )
    ORDER BY mt.level ASC, mt.created_at ASC
    LIMIT 9
  LOOP
    INSERT INTO public.mlm_distributions (
      project_support_payment_id,
      member_id,
      amount,
      distribution_pool,
      participants_count,
      is_company_share
    ) VALUES (
      p_payment_id,
      v_participant.member_id,
      v_per_person_amount,
      v_distribution_amount,
      v_participant_count,
      false
    );
    
    UPDATE public.member_balances
    SET total_commissions = total_commissions + v_per_person_amount,
        updated_at = now()
    WHERE member_id = v_participant.member_id;
    
    INSERT INTO public.member_balances (member_id, total_commissions)
    VALUES (v_participant.member_id, v_per_person_amount)
    ON CONFLICT (member_id) DO NOTHING;
  END LOOP;
  
  UPDATE public.project_support_contributions
  SET mlm_distributed = true
  WHERE id = p_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_member_mlm_tree()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id != '00000000-0000-0000-0000-000000000001' THEN
    PERFORM public.assign_to_mlm_tree(NEW.id, NEW.invited_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_profile_insert_mlm_tree ON public.profiles;
CREATE TRIGGER after_profile_insert_mlm_tree
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_member_mlm_tree();

CREATE OR REPLACE FUNCTION public.handle_project_support_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'approved' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'approved') THEN
    PERFORM public.distribute_mlm_earnings(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_project_support_approved ON public.project_support_contributions;
CREATE TRIGGER after_project_support_approved
AFTER UPDATE ON public.project_support_contributions
FOR EACH ROW
EXECUTE FUNCTION public.handle_project_support_approval();