-- Create trigger to update member balance when withdrawal is approved
CREATE TRIGGER update_balance_on_withdrawal
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_member_balance_on_withdrawal();