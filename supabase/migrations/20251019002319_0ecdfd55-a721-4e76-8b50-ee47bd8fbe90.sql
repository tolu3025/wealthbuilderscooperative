-- Update member balance for testing account to simulate 6 months of activity
UPDATE public.member_balances
SET 
  months_contributed = 6,
  total_capital = 60000,
  total_savings = 15000,
  total_project_support = 3000,
  eligible_for_dividend = true,
  eligible_for_withdrawal = true,
  last_contribution_date = now(),
  updated_at = now()
WHERE member_id = (
  SELECT id 
  FROM public.profiles 
  WHERE email = 'toluwanimioyetade@gmail.com'
  LIMIT 1
);