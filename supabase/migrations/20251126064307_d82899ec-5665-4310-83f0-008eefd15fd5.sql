-- Fix RLS policy for contributions to allow profile-based insertion during upgrades
DROP POLICY IF EXISTS "Members can create their own contributions" ON public.contributions;

CREATE POLICY "Members can create their own contributions" 
ON public.contributions 
FOR INSERT 
WITH CHECK (
  member_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on password reset tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No policies needed since edge functions will use service role

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token) WHERE NOT used;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at) WHERE NOT used;