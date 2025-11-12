-- Create MLM tree structure table for ternary tree management
CREATE TABLE public.mlm_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL CHECK (position IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id)
);

-- Create MLM distribution tracking table
CREATE TABLE public.mlm_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_support_payment_id UUID NOT NULL REFERENCES public.project_support_contributions(id),
  member_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL DEFAULT 30,
  distribution_pool NUMERIC NOT NULL DEFAULT 300,
  participants_count INTEGER NOT NULL DEFAULT 10,
  distribution_date TIMESTAMPTZ DEFAULT now(),
  is_company_share BOOLEAN DEFAULT false
);

-- Add MLM tracking fields to project_support_contributions
ALTER TABLE public.project_support_contributions
ADD COLUMN mlm_distributed BOOLEAN DEFAULT false,
ADD COLUMN distribution_amount NUMERIC DEFAULT 300,
ADD COLUMN reserve_amount NUMERIC DEFAULT 200;

-- Create company/system profile for MLM originator
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

-- Function to find next available parent in MLM tree (breadth-first)
CREATE OR REPLACE FUNCTION public.find_available_mlm_parent()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_parent UUID;
BEGIN
  -- Find first member with less than 3 children, ordered by level then created_at
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
  
  -- If no available parent found, return company
  IF available_parent IS NULL THEN
    available_parent := '00000000-0000-0000-0000-000000000001';
  END IF;
  
  RETURN available_parent;
END;
$$;

-- Function to assign member to MLM tree
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
  -- Check if member already in tree
  IF EXISTS (SELECT 1 FROM public.mlm_tree WHERE member_id = p_member_id) THEN
    RETURN;
  END IF;
  
  -- If inviter provided, check if they have space
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
  
  -- Get parent level
  SELECT level INTO v_parent_level
  FROM public.mlm_tree
  WHERE member_id = v_parent_id;
  
  IF v_parent_level IS NULL THEN
    v_parent_level := 0;
  END IF;
  
  -- Get next available position under parent
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
  FROM public.mlm_tree
  WHERE parent_id = v_parent_id;
  
  -- Insert into tree
  INSERT INTO public.mlm_tree (member_id, parent_id, level, position)
  VALUES (p_member_id, v_parent_id, v_parent_level + 1, v_next_position);
END;
$$;

-- Function to distribute MLM earnings immediately
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
  -- Check if already distributed
  IF EXISTS (SELECT 1 FROM public.project_support_contributions WHERE id = p_payment_id AND mlm_distributed = true) THEN
    RETURN;
  END IF;
  
  -- Get member who made payment
  SELECT member_id INTO v_member_id
  FROM public.project_support_contributions
  WHERE id = p_payment_id;
  
  -- Distribute to company (always included)
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
  
  -- Get next 9 eligible members from MLM tree (excluding company, ordered by tree position)
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
    -- Create distribution record
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
    
    -- Credit member's commission balance
    UPDATE public.member_balances
    SET total_commissions = total_commissions + v_per_person_amount,
        updated_at = now()
    WHERE member_id = v_participant.member_id;
    
    -- Create balance record if doesn't exist
    INSERT INTO public.member_balances (member_id, total_commissions)
    VALUES (v_participant.member_id, v_per_person_amount)
    ON CONFLICT (member_id) DO NOTHING;
  END LOOP;
  
  -- Mark as distributed
  UPDATE public.project_support_contributions
  SET mlm_distributed = true
  WHERE id = p_payment_id;
END;
$$;

-- Trigger to assign new members to MLM tree
CREATE OR REPLACE FUNCTION public.handle_new_member_mlm_tree()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign to MLM tree if not company profile
  IF NEW.id != '00000000-0000-0000-0000-000000000001' THEN
    PERFORM public.assign_to_mlm_tree(NEW.id, NEW.invited_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_profile_insert_mlm_tree
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_member_mlm_tree();

-- Trigger to distribute MLM earnings when project support is approved
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

CREATE TRIGGER after_project_support_approved
AFTER UPDATE ON public.project_support_contributions
FOR EACH ROW
EXECUTE FUNCTION public.handle_project_support_approval();

-- Enable RLS on new tables
ALTER TABLE public.mlm_tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlm_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mlm_tree
CREATE POLICY "Admins can manage MLM tree"
ON public.mlm_tree FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their own tree position"
ON public.mlm_tree FOR SELECT
TO authenticated
USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for mlm_distributions
CREATE POLICY "Admins can view all MLM distributions"
ON public.mlm_distributions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their own MLM distributions"
ON public.mlm_distributions FOR SELECT
TO authenticated
USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));