-- Safely create triggers for commissions and project support flows and backfill commissions/MLM

-- 1) Ensure trigger to update member_balances when commissions are approved
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_update_member_balance_on_commission'
  ) THEN
    CREATE TRIGGER trg_update_member_balance_on_commission
    AFTER UPDATE ON public.commissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_member_balance_on_commission();
  END IF;
END$$;

-- 2) Ensure trigger to auto-approve commissions when member becomes active
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_approve_commissions_on_activation'
  ) THEN
    CREATE TRIGGER trg_approve_commissions_on_activation
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.approve_commissions_on_activation();
  END IF;
END$$;

-- 3) Ensure trigger to handle MLM distribution when project support is approved
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_handle_project_support_approval'
  ) THEN
    CREATE TRIGGER trg_handle_project_support_approval
    AFTER UPDATE ON public.project_support_contributions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_project_support_approval();
  END IF;
END$$;

-- 4) Backfill: approve pending commissions for members whose registration is already active
UPDATE public.commissions c
SET status = 'approved'
FROM public.profiles p
WHERE c.invited_member_id = p.id
  AND p.registration_status = 'active'
  AND c.status = 'pending';

-- 5) Backfill member_balances.total_commissions based on approved commissions
-- Ensure a balance row exists for each member who has commissions
INSERT INTO public.member_balances (member_id, total_commissions)
SELECT DISTINCT c.member_id, 0
FROM public.commissions c
ON CONFLICT (member_id) DO NOTHING;

-- Recalculate total_commissions from approved commissions
UPDATE public.member_balances mb
SET total_commissions = COALESCE(sub.total_commissions, 0),
    updated_at = now()
FROM (
  SELECT member_id, SUM(amount) AS total_commissions
  FROM public.commissions
  WHERE status = 'approved'
  GROUP BY member_id
) sub
WHERE mb.member_id = sub.member_id;

-- 6) Backfill MLM distributions for already approved project support payments
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT id 
    FROM public.project_support_contributions
    WHERE payment_status = 'approved'
      AND COALESCE(mlm_distributed, false) = false
  LOOP
    PERFORM public.distribute_mlm_earnings(r.id);
  END LOOP;
END$$;