-- Create trigger to generate commissions when registration fee is approved
CREATE TRIGGER create_commissions_on_registration_approval
  AFTER UPDATE ON public.registration_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.create_referral_commissions();