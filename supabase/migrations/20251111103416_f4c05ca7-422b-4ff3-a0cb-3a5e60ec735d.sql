-- Add withdrawal_type column to withdrawal_requests table
ALTER TABLE public.withdrawal_requests
ADD COLUMN withdrawal_type TEXT NOT NULL DEFAULT 'savings'
CHECK (withdrawal_type IN ('savings', 'capital', 'dividend', 'bonus'));

-- Add comment explaining the withdrawal types
COMMENT ON COLUMN public.withdrawal_requests.withdrawal_type IS 'Type of withdrawal: savings, capital, dividend, or bonus';
